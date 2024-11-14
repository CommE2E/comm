use anyhow::Result;
use comm_lib::{auth::AuthService, blob::client::BlobServiceClient};
use constants::COMM_SERVICES_USE_JSON_LOGS;
use std::env;
use tracing::Level;
use tracing_subscriber::EnvFilter;

pub mod config;
pub mod constants;
pub mod database;
pub mod error;
pub mod http;
pub mod identity;

// re-export this to be available as crate::CONFIG
pub use config::CONFIG;

fn configure_logging() -> Result<()> {
  let use_json_logs: bool = env::var(COMM_SERVICES_USE_JSON_LOGS)
    .unwrap_or("false".to_string())
    .parse()
    .unwrap_or_default();

  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  if use_json_logs {
    let subscriber = tracing_subscriber::fmt()
      .json()
      .with_env_filter(filter)
      .finish();
    tracing::subscriber::set_global_default(subscriber)?;
  } else {
    let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
    tracing::subscriber::set_global_default(subscriber)?;
  }

  Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
  config::parse_cmdline_args();
  configure_logging()?;

  let aws_config = config::load_aws_config().await;
  let db_client = database::DatabaseClient::new(&aws_config);
  let blob_client = BlobServiceClient::new(CONFIG.blob_service_url.clone());
  let auth_service = AuthService::new(&aws_config, &CONFIG.identity_endpoint);

  http::run_http_server(db_client, blob_client, auth_service).await?;

  Ok(())
}
