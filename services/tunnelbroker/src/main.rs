pub mod amqp;
pub mod config;
pub mod constants;
pub mod database;
pub mod error;
pub mod grpc;
pub mod identity;
pub mod notifs;
pub mod websockets;

use crate::notifs::apns::APNsClient;
use crate::notifs::fcm::FCMClient;
use crate::notifs::web_push::WebPushClient;
use crate::notifs::wns::WNSClient;
use crate::notifs::NotifClient;
use anyhow::{anyhow, Result};
use config::CONFIG;
use constants::{error_types, COMM_SERVICES_USE_JSON_LOGS};
use std::env;
use tracing::{self, error, info, Level};
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

  let apns_config = CONFIG.apns_config.clone();

  let apns = match apns_config {
    Some(config) => match APNsClient::new(&config) {
      Ok(apns_client) => {
        info!("APNs client created successfully");
        Some(apns_client)
      }
      Err(err) => {
        error!(
          errorType = error_types::APNS_ERROR,
          "Error creating APNs client: {}", err
        );
        None
      }
    },
    None => {
      error!(
        errorType = error_types::APNS_ERROR,
        "APNs config is missing"
      );
      None
    }
  };

  let fcm_config = CONFIG.fcm_config.clone();
  let fcm = match fcm_config {
    Some(config) => match FCMClient::new(&config) {
      Ok(fcm_client) => {
        info!("FCM client created successfully");
        Some(fcm_client)
      }
      Err(err) => {
        error!(
          errorType = error_types::FCM_ERROR,
          "Error creating FCM client: {}", err
        );
        None
      }
    },
    None => {
      error!(errorType = error_types::FCM_ERROR, "FCM config is missing");
      None
    }
  };

  let web_push_config = CONFIG.web_push_config.clone();
  let web_push = match web_push_config {
    Some(config) => match WebPushClient::new(&config) {
      Ok(web_client) => {
        info!("Web Push client created successfully");
        Some(web_client)
      }
      Err(err) => {
        error!(
          errorType = error_types::WEB_PUSH_ERROR,
          "Error creating Web Push client: {}", err
        );
        None
      }
    },
    None => {
      error!(
        errorType = error_types::WEB_PUSH_ERROR,
        "Web Push config is missing"
      );
      None
    }
  };

  let wns_config = CONFIG.wns_config.clone();
  let wns = match wns_config {
    Some(config) => match WNSClient::new(&config) {
      Ok(wns_client) => {
        info!("WNS client created successfully");
        Some(wns_client)
      }
      Err(err) => {
        error!(
          errorType = error_types::WNS_ERROR,
          "Error creating WNS client: {}", err
        );
        None
      }
    },
    None => {
      error!(errorType = error_types::WNS_ERROR, "WNS config is missing");
      None
    }
  };

  let notif_client = NotifClient {
    apns,
    fcm,
    web_push,
    wns,
  };

  let grpc_server = grpc::run_server(db_client.clone(), &amqp_connection);
  let websocket_server = websockets::run_server(
    db_client.clone(),
    &amqp_connection,
    notif_client.clone(),
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
