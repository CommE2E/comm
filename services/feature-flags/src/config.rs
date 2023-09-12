use clap::Parser;
use once_cell::sync::Lazy;
use tracing::info;

use crate::constants::HTTP_SERVER_DEFAULT_PORT;

#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct AppConfig {
  /// AWS Localstack service URL
  #[arg(env = "LOCALSTACK_ENDPOINT")]
  #[arg(long)]
  pub localstack_endpoint: Option<String>,
  #[arg(long, default_value_t = HTTP_SERVER_DEFAULT_PORT)]
  pub http_port: u16,
}

pub static CONFIG: Lazy<AppConfig> = Lazy::new(AppConfig::parse);

pub fn parse_cmdline_args() {
  Lazy::force(&CONFIG);
}

pub async fn load_aws_config() -> aws_types::SdkConfig {
  let mut config_builder = aws_config::from_env();

  if let Some(endpoint) = &CONFIG.localstack_endpoint {
    info!("Using Localstack. AWS endpoint URL: {}", endpoint);
    config_builder = config_builder.endpoint_url(endpoint);
  }

  config_builder.load().await
}
