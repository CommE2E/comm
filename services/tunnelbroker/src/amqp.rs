use comm_lib::database::batch_operations::ExponentialBackoffConfig;
use lapin::{uri::AMQPUri, ConnectionProperties};
use once_cell::sync::Lazy;
use std::hash::Hasher;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
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
      if should_ignore_error(&err) {
        debug!("Ignored AMQP Lapin error: {err:?}");
        return;
      }
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
  ) -> Option<lapin::Channel> {
    let channel_idx = Self::channel_idx_for_hash(id_hash);
    let channel = self.channels[channel_idx].clone();
    let channel_id = channel.id();
    tracing::trace!(channel_id, channel_idx, "Retrieving AMQP Channel");

    if channel.status().connected() {
      return Some(channel);
    }
    warn!(channel_id, channel_idx, "Channel is dead!");
    None
  }

  async fn reset_channel(
    &mut self,
    id_hash: impl std::hash::Hash,
  ) -> Result<lapin::Channel, lapin::Error> {
    let channel_idx = Self::channel_idx_for_hash(id_hash);

    let existing_channel = &self.channels[channel_idx];
    if existing_channel.status().connected() {
      return Ok(existing_channel.clone());
    }

    let new_channel = self.conn.create_channel().await?;
    debug!(
      "Channel for idx={channel_idx} was recreated, new Id={}",
      new_channel.id()
    );
    self.channels[channel_idx] = new_channel.clone();
    Ok(new_channel)
  }

  fn is_connected(&self) -> bool {
    self.conn.status().connected()
  }

  fn channel_idx_for_hash(id_hash: impl std::hash::Hash) -> usize {
    // We have channel pool and want to distribute them between connected
    // devices. Round robin would work too, but by using "hash modulo N"
    // we make sure the same device will always use the same channel.
    // Generally this shouldn't matter, but helps avoiding potential issues
    // with the same queue name being declared by different channels,
    // in case of reconnection.
    let mut hasher = std::hash::DefaultHasher::new();
    id_hash.hash(&mut hasher);
    let channel_idx: usize = hasher.finish() as usize % NUM_AMQP_CHANNELS;
    channel_idx
  }
}

/// Thread safe connection wrapper that is `Clone + Send + Sync`
/// and can be shared wherever needed.
#[derive(Clone)]
pub struct AmqpConnection {
  inner: Arc<RwLock<ConnectionInner>>,
}

impl AmqpConnection {
  pub async fn connect() -> Result<Self, lapin::Error> {
    let conn = ConnectionInner::new().await?;
    let inner = Arc::new(RwLock::new(conn));
    info!("Connected to AMQP endpoint: {}", &CONFIG.amqp_uri);

    Ok(Self { inner })
  }

  pub async fn channel(
    &self,
    id_hash: impl std::hash::Hash + Clone,
  ) -> Result<lapin::Channel, lapin::Error> {
    if !self.is_connected().await {
      warn!("AMQP disconnected while retrieving channel");
      self.reset_conn().await?;
    }

    {
      let inner = self.inner.read().await;
      if let Some(channel) = inner.get_channel(id_hash.clone()) {
        return Ok(channel);
      }
    }

    self.inner.write().await.reset_channel(id_hash).await
  }

  async fn reset_conn(&self) -> Result<(), lapin::Error> {
    debug!("Resetting connection...");
    let mut inner = self.inner.write().await;
    if !inner.is_connected() {
      let new_conn = ConnectionInner::new().await?;
      *inner = new_conn;
      info!("AMQP Connection restored.");
    }
    Ok(())
  }

  async fn is_connected(&self) -> bool {
    self.inner.read().await.is_connected()
  }
}

fn should_ignore_error(err: &lapin::Error) -> bool {
  use lapin::Error as E;
  use std::io::ErrorKind;

  if is_connection_error(err) {
    return true;
  }

  if let E::IOError(io_error) = err {
    return match io_error.kind() {
      // Suppresses: "Socket was readable but we read 0.""
      // We handle this by auto-reconnecting
      ErrorKind::ConnectionAborted => true,
      _ => false,
    };
  }

  false
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
