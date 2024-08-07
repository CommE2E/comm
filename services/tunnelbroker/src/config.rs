use crate::constants;
use crate::constants::{
  ENV_APNS_CONFIG, ENV_FCM_CONFIG, ENV_WEB_PUSH_CONFIG, ENV_WNS_CONFIG,
};
use crate::notifs::apns::config::APNsConfig;
use crate::notifs::fcm::config::FCMConfig;
use crate::notifs::web_push::config::WebPushConfig;
use crate::notifs::wns::config::WNSConfig;
use anyhow::{ensure, Result};
use clap::Parser;
use comm_lib::aws;
use comm_lib::aws::config::BehaviorVersion;
use once_cell::sync::Lazy;
use tracing::info;

#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct AppConfig {
  /// gRPC server listening port
  #[arg(long, default_value_t = constants::GRPC_SERVER_PORT)]
  pub grpc_port: u16,
  /// HTTP server listening port
  #[arg(long, default_value_t = 51001)]
  pub http_port: u16,
  /// AMQP server URI
  #[arg(env = "AMQP_URI")]
  #[arg(long, default_value = "amqp://comm:comm@localhost:5672")]
  pub amqp_uri: String,
  /// AWS Localstack service URL
  #[arg(env = "LOCALSTACK_ENDPOINT")]
  #[arg(long)]
  pub localstack_endpoint: Option<String>,
  /// Comm Identity service URL
  #[arg(env = "COMM_TUNNELBROKER_IDENTITY_ENDPOINT")]
  #[arg(long, default_value = "http://localhost:50054")]
  pub identity_endpoint: String,
  /// APNs secrets
  #[arg(env = ENV_APNS_CONFIG)]
  #[arg(long)]
  pub apns_config: Option<APNsConfig>,
  /// FCM secrets
  #[arg(env = ENV_FCM_CONFIG)]
  #[arg(long)]
  pub fcm_config: Option<FCMConfig>,
  /// Web Push secrets
  #[arg(env = ENV_WEB_PUSH_CONFIG)]
  #[arg(long)]
  pub web_push_config: Option<WebPushConfig>,
  /// WNS secrets
  #[arg(env = ENV_WNS_CONFIG)]
  #[arg(long)]
  pub wns_config: Option<WNSConfig>,
}

/// Stores configuration parsed from command-line arguments
/// and environment variables
pub static CONFIG: Lazy<AppConfig> = Lazy::new(AppConfig::parse);

/// Processes the command-line arguments and environment variables.
/// Should be called at the beginning of the `main()` function.
pub(super) fn parse_cmdline_args() -> Result<()> {
  // force evaluation of the lazy initialized config
  let cfg = Lazy::force(&CONFIG);

  // Perform some additional validation for CLI args
  ensure!(
    cfg.grpc_port != cfg.http_port,
    "gRPC and HTTP ports cannot be the same: {}",
    cfg.grpc_port
  );
  Ok(())
}

/// Provides region/credentials configuration for AWS SDKs
pub async fn load_aws_config() -> aws::AwsConfig {
  let mut config_builder =
    aws::config::defaults(BehaviorVersion::v2024_03_28());

  if let Some(endpoint) = &CONFIG.localstack_endpoint {
    info!("Using localstack URL: {}", endpoint);
    config_builder = config_builder.endpoint_url(endpoint);
  }

  config_builder.load().await
}
