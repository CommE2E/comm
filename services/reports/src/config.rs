use anyhow::Result;
use clap::{ArgAction, Parser};
use comm_services_lib::blob::client::Url;
use once_cell::sync::Lazy;
use tracing::{info, warn};

use crate::email::config::{EmailArgs, EmailConfig};

// environment variable names
const ENV_LOCALSTACK_ENDPOINT: &str = "LOCALSTACK_ENDPOINT";
const ENV_BLOB_SERVICE_URL: &str = "BLOB_SERVICE_URL";
const ENV_PUBLIC_URL: &str = "PUBLIC_URL";

/// Base URL on which Reports service is accessible.
/// Used for sending e-mail links.
pub static SERVICE_PUBLIC_URL: Lazy<String> = Lazy::new(|| {
  std::env::var(ENV_PUBLIC_URL)
    .ok()
    .filter(|s| !s.is_empty())
    .unwrap_or_else(|| "http://localhost:50056".to_string())
});

#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct AppConfig {
  /// HTTP server listening port
  #[arg(long, default_value_t = 50056)]
  pub http_port: u16,

  #[arg(env = ENV_BLOB_SERVICE_URL)]
  #[arg(long, default_value = "http://localhost:50053")]
  pub blob_service_url: Url,

  /// Should reports be encrypted? Note that this flag disables encryption
  /// which is enabled by default.
  #[arg(long = "no-encrypt", action = ArgAction::SetFalse)]
  pub encrypt_reports: bool,

  /// AWS Localstack service URL
  #[arg(env = ENV_LOCALSTACK_ENDPOINT)]
  #[arg(long)]
  localstack_endpoint: Option<String>,

  /// This config shouldn't be used directly. It's used for parsing purposes
  /// only. Use [`AppConfig::email_config()`] instead.
  #[command(flatten)]
  email_args: EmailArgs,
}

impl AppConfig {
  pub fn is_dev(&self) -> bool {
    self.localstack_endpoint.is_some()
  }

  pub fn email_config(&self) -> Option<EmailConfig> {
    // we return None in case of error because this should've already been
    // checked by parse_cmdline_args()
    self.email_args.parse().ok().flatten()
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

  // initialize e-mail config to check for errors
  match cfg.email_args.parse()? {
    Some(_) => {
      info!("E-mail config found. E-mail notifications are enabled.");
    }
    None => {
      warn!("E-mail config is disabled or missing! E-mails will not be sent.");
    }
  }

  if !cfg.encrypt_reports {
    warn!("Encryption disabled. Reports will be stored in plaintext!");
  }

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
