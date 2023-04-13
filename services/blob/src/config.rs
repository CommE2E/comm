use aws_sdk_dynamodb::Region;
use clap::{builder::FalseyValueParser, Parser, ValueEnum};
use once_cell::sync::Lazy;
use tracing::info;

use crate::constants::{
  AWS_REGION, DEFAULT_LISTEN_PORT, LOCALSTACK_URL, SANDBOX_ENV_VAR,
};

#[derive(ValueEnum, Clone, Debug)]
pub enum Protocol {
  Grpc,
  Http,
}

#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct AppConfig {
  /// Protocol to use for the service server
  #[arg(long, value_enum, default_value_t = Protocol::Grpc)]
  pub protocol: Protocol,
  /// HTTP/gRPC server listening port
  #[arg(long = "port", default_value_t = DEFAULT_LISTEN_PORT)]
  pub listen_port: u16,
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
pub(super) fn parse_cmdline_args() {
  // force evaluation of the lazy initialized config
  Lazy::force(&CONFIG);
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
