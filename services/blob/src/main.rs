pub mod config;
pub mod constants;
pub mod database;
pub mod http;
pub mod s3;
pub mod service;
pub mod tools;

use anyhow::Result;
use comm_services_lib::auth::AuthService;
use tracing_subscriber::filter::{EnvFilter, LevelFilter};

use crate::service::BlobServiceConfig;

fn configure_logging() -> Result<()> {
  let filter = EnvFilter::builder()
    .with_default_directive(LevelFilter::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
  tracing::subscriber::set_global_default(subscriber)?;
  Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
  configure_logging()?;
  let config = config::parse_cmdline_args()?;

  let aws_config = config::load_aws_config().await;
  let db = database::DatabaseClient::new(&aws_config);
  let s3 = s3::S3Client::new(&aws_config);
  let auth_service = AuthService::new(&aws_config, &config.identity_endpoint);

  let blob_service = service::BlobService::new(
    db,
    s3,
    BlobServiceConfig {
      instant_delete_orphaned_blobs: true,
      ..Default::default()
    },
  );

  crate::http::run_http_server(blob_service, auth_service).await
}
