pub mod amqp;
pub mod config;
pub mod constants;
pub mod database;
pub mod error;
pub mod grpc;
pub mod identity;
pub mod notifs;
pub mod websockets;

use crate::constants::ENV_APNS_CONFIG;
use crate::notifs::apns::config::APNsConfig;
use crate::notifs::apns::APNsClient;
use crate::notifs::NotifClient;
use anyhow::{anyhow, Result};
use config::CONFIG;
use std::str::FromStr;
use tracing::{self, error, info, Level};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
  tracing::subscriber::set_global_default(subscriber)
    .expect("Unable to configure tracing");

  config::parse_cmdline_args()?;
  let aws_config = config::load_aws_config().await;
  let db_client = database::DatabaseClient::new(&aws_config);
  let amqp_connection = amqp::connect().await;

  let apns_config = CONFIG.apns_config.clone();

  let apns = match apns_config {
    Some(config) => match APNsClient::new(&config) {
      Ok(apns_client) => {
        info!("APNs client created successfully");
        Some(apns_client)
      }
      Err(err) => {
        error!("Error creating APNs client: {}", err);
        None
      }
    },
    None => {
      error!("APNs config is missing");
      None
    }
  };

  let notif_client = NotifClient { apns };

  let grpc_server = grpc::run_server(db_client.clone(), &amqp_connection);
  let websocket_server = websockets::run_server(
    db_client.clone(),
    &amqp_connection,
    notif_client.clone(),
  );

  tokio::select! {
    Ok(_) = grpc_server => { Ok(()) },
    Ok(_) = websocket_server => { Ok(()) },
    else => {
      tracing::error!("A grpc or websocket server crashed.");
      Err(anyhow!("A grpc or websocket server crashed."))
    }
  }
}
