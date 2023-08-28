use anyhow::Result;
use clap::Parser;
use comm_services_lib::blob::client::Url;
use once_cell::sync::{Lazy, OnceCell};
use tracing::info;

use crate::email::config::{EmailArgs, EmailConfig};

// environment variable names
const ENV_LOCALSTACK_ENDPOINT: &str = "LOCALSTACK_ENDPOINT";
const ENV_BLOB_SERVICE_URL: &str = "BLOB_SERVICE_URL";

#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct AppConfig {
  /// HTTP server listening port
  #[arg(long, default_value_t = 50056)]
  pub http_port: u16,
  #[arg(env = ENV_BLOB_SERVICE_URL)]
  #[arg(long, default_value = "http://localhost:50053")]
  pub blob_service_url: Url,
  /// AWS Localstack service URL
  #[arg(env = ENV_LOCALSTACK_ENDPOINT)]
  #[arg(long)]
  localstack_endpoint: Option<String>,

  /// This config shouldn't be used directly.
  /// Use [`AppConfig::email_config()`] instead.
  #[clap(skip)]
  email_config: OnceCell<Option<EmailConfig>>,
  /// used for parsing purposes only
  #[command(flatten)]
  email_args: EmailArgs,
}

impl AppConfig {
  pub fn is_dev(&self) -> bool {
    self.localstack_endpoint.is_some()
  }

  pub fn emails_enabled(&self) -> bool {
    self.email_config().is_some()
  }

  pub fn email_config(&self) -> Option<&EmailConfig> {
    self.email_config.get().and_then(Option::as_ref)
  }
}

/// Stores configuration parsed from command-line arguments
/// and environment variables
pub static CONFIG: Lazy<AppConfig> = Lazy::new(AppConfig::parse);

/// Processes the command-line arguments and environment variables.
/// Should be called at the beginning of the `main()` function.
pub(super) fn parse_cmdline_args() -> Result<&'static AppConfig> {
  // force evaluation of the lazy initialized config
  let cfg = Lazy::force(&CONFIG);

  // initialize e-mail config
  cfg
    .email_config
    .get_or_try_init(|| cfg.email_args.parse())?;

  Ok(cfg)
}

/// Provides region/credentials configuration for AWS SDKs
pub async fn load_aws_config() -> aws_config::SdkConfig {
  let mut config_builder = aws_config::from_env();

  if let Some(endpoint) = &CONFIG.localstack_endpoint {
    info!("Using Localstack. AWS Endpoint URL: {}", endpoint);
    config_builder = config_builder.endpoint_url(endpoint);
  }

  config_builder.load().await
}
