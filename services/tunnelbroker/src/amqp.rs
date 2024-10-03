use comm_lib::database::batch_operations::ExponentialBackoffConfig;
use lapin::{uri::AMQPUri, ConnectionProperties};
use once_cell::sync::Lazy;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{debug, error, info};

use crate::constants::error_types;
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
}

impl ConnectionInner {
  async fn new() -> Result<Self, lapin::Error> {
    let conn = create_connection().await?;
    conn.on_error(|err| {
      // TODO: we should filter out some IOErrors here to avoid spamming alerts
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

  async fn is_connected(&self) -> bool {
    self.inner.read().await.is_connected()
  }
}

fn from_env(var_name: &str) -> Option<String> {
  std::env::var(var_name).ok().filter(|s| !s.is_empty())
}
