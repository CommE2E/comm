use aws_sdk_dynamodb::{Endpoint, Region};
use clap::{builder::FalseyValueParser, Parser};
use http::Uri;
use once_cell::sync::Lazy;
use tracing::info;

use crate::constants::{
  AWS_REGION, DEFAULT_LOCALSTACK_URL, HTTP_SERVER_DEFAULT_PORT,
};

#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct AppConfig {
  /// Run the service in sandbox
  #[arg(long = "sandbox", default_value_t = false)]
  #[arg(value_parser = FalseyValueParser::new())]
  pub is_sandbox: bool,
  /// AWS Localstack service URL, applicable in sandbox mode
  #[arg(long, default_value_t = DEFAULT_LOCALSTACK_URL.to_string())]
  pub localstack_url: String,
  #[arg(long = "port", default_value_t = HTTP_SERVER_DEFAULT_PORT)]
  pub http_port: u16,
}

pub static CONFIG: Lazy<AppConfig> = Lazy::new(|| AppConfig::parse());

pub fn parse_cmdline_args() {
  Lazy::force(&CONFIG);
}

pub async fn load_aws_config() -> aws_types::SdkConfig {
  let mut config_builder =
    aws_config::from_env().region(Region::new(AWS_REGION));

  if CONFIG.is_sandbox {
    info!(
      "Running in sandbox environment. Localstack URL: {}",
      &CONFIG.localstack_url
    );
    config_builder = config_builder.endpoint_resolver(Endpoint::immutable(
      Uri::from_static(&CONFIG.localstack_url),
    ));
  }

  config_builder.load().await
}
