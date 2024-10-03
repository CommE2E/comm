use comm_lib::database::batch_operations::ExponentialBackoffConfig;
use lapin::{uri::AMQPUri, Connection, ConnectionProperties};
use once_cell::sync::Lazy;
use std::time::Duration;
use tracing::info;

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

pub async fn connect() -> Connection {
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
  let conn_result = loop {
    let amqp_uri = Lazy::force(&AMQP_URI).clone();
    match lapin::Connection::connect_uri(amqp_uri, options.clone()).await {
      Ok(conn) => break Ok(conn),
      Err(err) => {
        let attempt = retry_counter.attempt();
        tracing::warn!(attempt, "AMQP connection attempt failed: {err}.");

        if retry_counter.sleep_and_retry().await.is_err() {
          tracing::error!("Unable to connect to AMQP: {err}");
          break Err(err);
        }
      }
    }
  };

  let conn = conn_result.expect("Unable to connect to AMQP. Exiting.");
  conn.on_error(|error| {
    tracing::error!(
      errorType = error_types::AMQP_ERROR,
      "Lapin error: {error:?}"
    );
  });

  info!("Connected to AMQP endpoint: {}", &CONFIG.amqp_uri);
  conn
}

fn from_env(var_name: &str) -> Option<String> {
  std::env::var(var_name).ok().filter(|s| !s.is_empty())
}
