use aws_config::BehaviorVersion;
use clap::Parser;
use once_cell::sync::Lazy;
use tracing::info;

use crate::constants::{DEFAULT_BLOB_SERVICE_URL, DEFAULT_HTTP_PORT};

#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct AppConfig {
  /// HTTP server listening port
  #[arg(long, default_value_t = DEFAULT_HTTP_PORT)]
  pub http_port: u16,
  /// AWS Localstack service URL
  #[arg(env = "LOCALSTACK_ENDPOINT")]
  #[arg(long)]
  pub localstack_endpoint: Option<String>,
  /// Blob service URL
  #[arg(env = "BLOB_SERVICE_URL")]
  #[arg(long, default_value = DEFAULT_BLOB_SERVICE_URL)]
  pub blob_service_url: reqwest::Url,
  /// Identity service endpoint
  #[arg(env = "IDENTITY_SERVICE_ENDPOINT")]
  #[arg(long, default_value = "http://localhost:50054")]
  pub identity_endpoint: String,
  #[arg(long, default_value_t = false)]
  pub remove_old_backups: bool,
}

/// Stores configuration parsed from command-line arguments
/// and environment variables
pub static CONFIG: Lazy<AppConfig> = Lazy::new(AppConfig::parse);

/// Processes the command-line arguments and environment variables.
/// Should be called at the beginning of the `main()` function.
pub(super) fn parse_cmdline_args() {
  // force evaluation of the lazy initialized config
  Lazy::force(&CONFIG);
}

/// Provides region/credentials configuration for AWS SDKs
pub async fn load_aws_config() -> aws_config::SdkConfig {
  let mut config_builder = aws_config::defaults(BehaviorVersion::v2024_03_28());

  if let Some(endpoint) = &CONFIG.localstack_endpoint {
    info!("Using Localstack. AWS endpoint URL: {}", endpoint);
    config_builder = config_builder.endpoint_url(endpoint);
  }

  config_builder.load().await
}
