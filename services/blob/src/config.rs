use anyhow::{ensure, Result};
use aws_sdk_dynamodb::Region;
use clap::{builder::FalseyValueParser, Parser};
use once_cell::sync::Lazy;
use tracing::info;

use crate::constants::{
  AWS_REGION, DEFAULT_GRPC_PORT, DEFAULT_HTTP_PORT, LOCALSTACK_URL,
  SANDBOX_ENV_VAR,
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
  /// Run the service in sandbox
  #[arg(long = "sandbox", default_value_t = false)]
  // support the env var for compatibility reasons
  #[arg(env = SANDBOX_ENV_VAR)]
  #[arg(value_parser = FalseyValueParser::new())]
  pub is_sandbox: bool,
  /// AWS Localstack service URL, applicable in sandbox mode
  #[arg(long, default_value_t = LOCALSTACK_URL.to_string())]
  pub localstack_url: String,
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
pub async fn load_aws_config() -> aws_types::SdkConfig {
  let mut config_builder =
    aws_config::from_env().region(Region::new(AWS_REGION));

  if CONFIG.is_sandbox {
    info!(
      "Running in sandbox environment. Localstack URL: {}",
      &CONFIG.localstack_url
    );
    config_builder = config_builder.endpoint_url(&CONFIG.localstack_url);
  }

  config_builder.load().await
}
