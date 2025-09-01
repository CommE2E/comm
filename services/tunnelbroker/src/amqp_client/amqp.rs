use crate::constants::{error_types, CLIENT_RMQ_MSG_PRIORITY};
use crate::database::DatabaseClient;
use crate::CONFIG;
use comm_lib::aws::ddb::error::SdkError;
use comm_lib::aws::ddb::operation::put_item::PutItemError;
use comm_lib::database::batch_operations::ExponentialBackoffConfig;
use lapin::{options::BasicPublishOptions, BasicProperties};
use lapin::{uri::AMQPUri, ConnectionProperties};
use once_cell::sync::Lazy;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{Mutex, RwLock};
use tracing::{debug, error, info, warn};
use tunnelbroker_messages::MessageToDevice;
use uuid;

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

    Ok(Self { conn })
  }

  fn is_connected(&self) -> bool {
    self.conn.status().connected()
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

  pub async fn new_channel(&self) -> Result<lapin::Channel, lapin::Error> {
    if !self.is_connected().await {
      warn!("AMQP disconnected while retrieving channel");
      self.reset_conn().await?;
    }
    self.inner.read().await.conn.create_channel().await
  }

  async fn reset_conn(&self) -> Result<(), lapin::Error> {
    let mut inner = self.inner.write().await;
    if !inner.is_connected() {
      debug!("Resetting AMQP connection...");
      let new_conn = ConnectionInner::new().await?;
      *inner = new_conn;
      info!("AMQP Connection restored.");
    }
    Ok(())
  }

  async fn is_connected(&self) -> bool {
    self.inner.read().await.is_connected()
  }

  pub fn maybe_reconnect_in_background(&self) {
    let this = self.clone();
    tokio::spawn(async move { this.reset_conn().await });
  }
}

/// Wrapper over [`lapin::Channel`] that automatically recreates AMQP channel
/// in case of errors. The channel is initialized on first use.
///
/// TODO: Add support for restoring channel topology (queues and consumers)
/// (`lapin` has this built-in, but it's internal crate feature)
pub struct AmqpChannel {
  conn: AmqpConnection,
  channel: Arc<Mutex<Option<lapin::Channel>>>,
}

impl AmqpChannel {
  pub fn new(amqp_connection: &AmqpConnection) -> Self {
    let channel = Arc::new(Mutex::new(None));
    Self {
      conn: amqp_connection.clone(),
      channel,
    }
  }

  pub async fn get(&self) -> Result<lapin::Channel, lapin::Error> {
    let mut channel = self.channel.lock().await;
    match channel.as_ref() {
      Some(ch) if ch.status().connected() => Ok(ch.clone()),
      _ => {
        let new_channel = self.conn.new_channel().await?;
        let channel_id = new_channel.id();
        debug!(channel_id, "Instantiated lazy AMQP channel.");
        *channel = Some(new_channel.clone());
        Ok(new_channel)
      }
    }
  }
}

fn should_ignore_error(err: &lapin::Error) -> bool {
  use lapin::protocol::{AMQPErrorKind, AMQPHardError};
  use lapin::Error as E;
  use std::io::ErrorKind;

  if is_connection_error(err) {
    return true;
  }

  match err {
    E::ProtocolError(amqp_err) => match amqp_err.kind() {
      // Suppresses:
      // "CONNECTION_FORCED - broker forced connection closure with reason 'shutdown'"
      // We handle this by auto-reconnecting
      AMQPErrorKind::Hard(AMQPHardError::CONNECTIONFORCED) => true,
      _ => false,
    },
    E::IOError(io_err) => match io_err.kind() {
      // Suppresses: "Socket was readable but we read 0.""
      // We handle this by auto-reconnecting
      ErrorKind::ConnectionAborted => true,
      _ => false,
    },
    _ => false,
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

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum SendMessageError {
  PersistenceError(SdkError<PutItemError>),
  SerializationError(serde_json::Error),
  AmqpError(lapin::Error),
}
pub async fn send_message_to_device(
  database_client: &DatabaseClient,
  amqp_channel: &AmqpChannel,
  device_id: String,
  payload: String,
) -> Result<(), SendMessageError> {
  debug!("Received message for {}", &device_id);

  let client_message_id = uuid::Uuid::new_v4().to_string();

  let message_id = database_client
    .persist_message(&device_id, &payload, &client_message_id)
    .await?;

  let message_to_device = MessageToDevice {
    device_id: device_id.clone(),
    payload,
    message_id,
  };

  let serialized_message = serde_json::to_string(&message_to_device)?;

  amqp_channel
    .get()
    .await?
    .basic_publish(
      "",
      &device_id,
      BasicPublishOptions::default(),
      serialized_message.as_bytes(),
      BasicProperties::default().with_priority(CLIENT_RMQ_MSG_PRIORITY),
    )
    .await?;

  Ok(())
}
