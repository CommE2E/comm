pub mod amqp_client;
pub mod config;
pub mod constants;
pub mod database;
pub mod error;
pub mod farcaster;
pub mod grpc;
pub mod identity;
pub mod notifs;
pub mod websockets;

use crate::farcaster::FarcasterClient;
use crate::notifs::NotifClient;
use amqp_client::amqp;
use anyhow::{anyhow, Result};
use config::CONFIG;
use constants::COMM_SERVICES_USE_JSON_LOGS;
use std::env;
use tracing::{self, Level};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
  let use_json_logs: bool = env::var(COMM_SERVICES_USE_JSON_LOGS)
    .unwrap_or("false".to_string())
    .parse()
    .unwrap_or_default();

  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  if use_json_logs {
    let subscriber = tracing_subscriber::fmt()
      .json()
      .with_env_filter(filter)
      .finish();
    tracing::subscriber::set_global_default(subscriber)
      .expect("Unable to configure tracing");
  } else {
    let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
    tracing::subscriber::set_global_default(subscriber)
      .expect("Unable to configure tracing");
  }

  config::parse_cmdline_args()?;
  let aws_config = config::load_aws_config().await;
  let db_client = database::DatabaseClient::new(&aws_config);
  let amqp_connection = amqp::AmqpConnection::connect()
    .await
    .expect("Failed to create AMQP connection");

  let notif_client = NotifClient::new(db_client.clone());

  let farcaster_api_url = CONFIG.farcaster_api_url.clone();
  let farcaster_client = FarcasterClient::new(farcaster_api_url)
    .expect("Unable to create Farcaster client");

  let grpc_server = grpc::run_server(db_client.clone(), &amqp_connection);
  let websocket_server = websockets::run_server(
    db_client.clone(),
    &amqp_connection,
    notif_client.clone(),
    farcaster_client.clone(),
  );

  tokio::select! {
    grpc_result = grpc_server => {
      grpc_result.map_err(|err| anyhow!("gRPC server failed: {:?}", err))
    },
    ws_result = websocket_server => {
      ws_result.map_err(|err| anyhow!("WS server failed: {:?}", err))
    },
  }
}
