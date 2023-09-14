use crate::constants;
use anyhow::{ensure, Result};
use clap::Parser;
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
  #[arg(long, default_value_t = String::from("http://localhost:50054"))]
  pub identity_endpoint: String,
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
pub async fn load_aws_config() -> aws_config::SdkConfig {
  let mut config_builder = aws_config::from_env();

  if let Some(endpoint) = &CONFIG.localstack_endpoint {
    info!("Using localstack URL: {}", endpoint);
    config_builder = config_builder.endpoint_url(endpoint);
  }

  config_builder.load().await
}
