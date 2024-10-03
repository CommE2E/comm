use comm_lib::database::batch_operations::ExponentialBackoffConfig;
use lapin::{uri::AMQPUri, ConnectionProperties};
use once_cell::sync::Lazy;
use std::hash::Hasher;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tracing::{debug, error, info, warn};

use crate::constants::{error_types, NUM_AMQP_CHANNELS};
use crate::CONFIG;

static AMQP_URI: Lazy<AMQPUri> = Lazy::new(|| {
  let mut amqp_uri = CONFIG
    .amqp_uri
    .parse::<AMQPUri>()
    .expect("Invalid AMQP URI");

  // Allow set / override credentials using env vars
  if let Some(amqp_user) = from_env("AMQP_USERNAME") {
    amqp_uri.authority.userinfo.username = amqp_user;
  }
  if let Some(amqp_pass) = from_env("AMQP_PASSWORD") {
    amqp_uri.authority.userinfo.password = amqp_pass;
  }

  amqp_uri
});

async fn create_connection() -> Result<lapin::Connection, lapin::Error> {
  let options = ConnectionProperties::default()
    .with_executor(tokio_executor_trait::Tokio::current())
    .with_reactor(tokio_reactor_trait::Tokio);

  let retry_config = ExponentialBackoffConfig {
    max_attempts: 5,
    base_duration: Duration::from_millis(500),
    ..Default::default()
  };
  let mut retry_counter = retry_config.new_counter();

  tracing::debug!("Attempting to connect to AMQP...");
  loop {
    let amqp_uri = Lazy::force(&AMQP_URI).clone();
    match lapin::Connection::connect_uri(amqp_uri, options.clone()).await {
      Ok(conn) => return Ok(conn),
      Err(err) => {
        let attempt = retry_counter.attempt();
        tracing::warn!(attempt, "AMQP connection attempt failed: {err}.");

        if retry_counter.sleep_and_retry().await.is_err() {
          tracing::error!("Unable to connect to AMQP: {err}");
          return Err(err);
        }
      }
    }
  }
}

pub async fn connect() -> lapin::Connection {
  let conn = create_connection()
    .await
    .expect("Unable to connect to AMQP. Exiting.");
  conn.on_error(|error| {
    tracing::error!(
      errorType = error_types::AMQP_ERROR,
      "Lapin error: {error:?}"
    );
  });

  info!("Connected to AMQP endpoint: {}", &CONFIG.amqp_uri);
  conn
}

/// Inner connection that is a direct wrapper over [`lapin::Connection`]
/// This should be instantiated only once to establish connection
/// New instances can be created to reconnect
struct ConnectionInner {
  conn: lapin::Connection,
  // channel pool
  channels: [lapin::Channel; NUM_AMQP_CHANNELS],
}

impl ConnectionInner {
  async fn new() -> Result<Self, lapin::Error> {
    let conn = create_connection().await?;
    conn.on_error(|err| {
      // TODO: we should filter out some IOErrors here to avoid spamming alerts
      error!(errorType = error_types::AMQP_ERROR, "Lapin error: {err:?}");
    });

    debug!("Creating channels...");
    let mut channels = Vec::with_capacity(NUM_AMQP_CHANNELS);
    for idx in 0..NUM_AMQP_CHANNELS {
      let channel = conn.create_channel().await?;
      tracing::trace!("Creating channel ID={} at index={}", channel.id(), idx);
      channels.push(channel);
    }

    Ok(Self {
      conn,
      channels: channels
        .try_into()
        .expect("Channels vec size doesn't match array size"),
    })
  }

  fn get_channel(
    &self,
    id_hash: impl std::hash::Hash,
  ) -> Result<lapin::Channel, lapin::Error> {
    // We have channel pool and want to distribute them between connected
    // devices. Round robin would work too, but by using "hash modulo N"
    // we make sure the same device will always use the same channel.
    // Generally this shouldn't matter, but helps avoiding potential issues
    // with the same queue name being declared by different channels,
    // in case of reconnection.
    let mut hasher = std::hash::DefaultHasher::new();
    id_hash.hash(&mut hasher);
    let channel_idx: usize = hasher.finish() as usize % NUM_AMQP_CHANNELS;

    let channel = self.channels[channel_idx].clone();
    let channel_id = channel.id();
    tracing::trace!(channel_id, channel_idx, "Retrieving AMQP Channel");
    Ok(channel)
  }

  fn is_connected(&self) -> bool {
    self.conn.status().connected()
  }

  fn raw(&self) -> &lapin::Connection {
    &self.conn
  }
}

/// Thread safe connection wrapper that is `Clone + Send + Sync`
/// and can be shared wherever needed.
#[derive(Clone)]
pub struct AmqpConnection {
  inner: Arc<RwLock<ConnectionInner>>,
  is_connecting: Arc<AtomicBool>,
}

impl AmqpConnection {
  pub async fn connect() -> Result<Self, lapin::Error> {
    let conn = ConnectionInner::new().await?;
    let inner = Arc::new(RwLock::new(conn));
    info!("Connected to AMQP endpoint: {}", &CONFIG.amqp_uri);

    let is_connecting = AtomicBool::new(false);
    Ok(Self {
      inner,
      is_connecting: Arc::new(is_connecting),
    })
  }

  pub async fn channel(
    &self,
    id_hash: impl std::hash::Hash,
  ) -> Result<lapin::Channel, lapin::Error> {
    if !self.is_connected() {
      warn!("AMQP disconnected while retrieving channel");
      self.reset_conn().await?;
    }
    self.inner.read().unwrap().get_channel(id_hash)
  }

  /// Triggers reconnecting in background, without awaiting
  pub fn trigger_reconnect(&self) {
    if !self.is_connected() && !self.is_connecting() {
      let this = self.clone();
      tokio::spawn(async move {
        if let Err(err) = this.reset_conn().await {
          tracing::warn!("AMQP background reconnect failed: {:?}", err);
        }
      });
    }
  }

  async fn reset_conn(&self) -> Result<(), lapin::Error> {
    if let Ok(false) = self.is_connecting.compare_exchange(
      false,
      true,
      Ordering::Relaxed,
      Ordering::Relaxed,
    ) {
      debug!("Resetting connection...");
      let new_conn = ConnectionInner::new().await?;
      let mut inner = self.inner.write().unwrap();
      if !inner.is_connected() {
        *inner = new_conn;
        info!("AMQP Connection restored.");
      }

      self.is_connecting.store(false, Ordering::Relaxed);
    } else {
      debug!("Already resetting on other thread");
      while self.is_connecting() {
        tokio::time::sleep(Duration::from_millis(10)).await;
      }
      if !self.is_connected() {
        // other thread failed to reset
        let state = self.inner.read().unwrap().raw().status().state();
        warn!("Other thread failed to reset. State: {:?}", state);
        return Err(lapin::Error::InvalidConnectionState(state));
      }
    }
    Ok(())
  }

  fn is_connecting(&self) -> bool {
    self.is_connecting.load(Ordering::Relaxed)
  }

  fn is_connected(&self) -> bool {
    self.inner.read().unwrap().is_connected()
  }
}

pub fn is_connection_error(err: &lapin::Error) -> bool {
  matches!(
    err,
    lapin::Error::InvalidChannelState(_)
      | lapin::Error::InvalidConnectionState(_)
  )
}

fn from_env(var_name: &str) -> Option<String> {
  std::env::var(var_name).ok().filter(|s| !s.is_empty())
}
