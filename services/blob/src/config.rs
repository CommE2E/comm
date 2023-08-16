use anyhow::{ensure, Result};
use clap::Parser;
use once_cell::sync::Lazy;
use tracing::info;

use crate::constants::{
  DEFAULT_GRPC_PORT, DEFAULT_HTTP_PORT, DEFAULT_S3_BUCKET_NAME,
  S3_BUCKET_ENV_VAR,
};

#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct AppConfig {
  /// gRPC server listening port
  #[arg(long, default_value_t = DEFAULT_GRPC_PORT)]
  pub grpc_port: u16,
  /// HTTP server listening port
  #[arg(long, default_value_t = DEFAULT_HTTP_PORT)]
  pub http_port: u16,
  /// AWS Localstack service URL
  #[arg(env = "LOCALSTACK_ENDPOINT")]
  #[arg(long)]
  pub localstack_endpoint: Option<String>,
  #[arg(env = S3_BUCKET_ENV_VAR)]
  #[arg(long, default_value_t = DEFAULT_S3_BUCKET_NAME.to_string())]
  pub s3_bucket_name: String,
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

  if cfg.s3_bucket_name != DEFAULT_S3_BUCKET_NAME {
    info!("Using custom S3 bucket: {}", &cfg.s3_bucket_name);
  }
  Ok(())
}

/// Provides region/credentials configuration for AWS SDKs
pub async fn load_aws_config() -> aws_types::SdkConfig {
  let mut config_builder = aws_config::from_env();

  if let Some(endpoint) = &CONFIG.localstack_endpoint {
    info!("Using Localstack. AWS endpoint URL: {}", endpoint);
    config_builder = config_builder.endpoint_url(endpoint);
  }

  config_builder.load().await
}
