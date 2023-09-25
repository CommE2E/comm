pub mod config;
pub mod constants;
pub mod database;
pub mod email;
pub mod http;
pub mod report_types;
pub mod report_utils;
pub mod service;

use anyhow::Result;
use comm_services_lib::{auth::AuthService, blob::client::BlobServiceClient};
use service::ReportsService;
use tracing_subscriber::filter::{EnvFilter, LevelFilter};

fn configure_logging() -> Result<()> {
  let filter = EnvFilter::builder()
    .with_default_directive(LevelFilter::INFO.into())
    .with_env_var(EnvFilter::DEFAULT_ENV)
    .from_env_lossy();

  // init HTTP logger - it relies on 'log' instead of 'tracing'
  // so we have to initialize a polyfill
  tracing_log::LogTracer::init()?;

  let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
  tracing::subscriber::set_global_default(subscriber)?;
  Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
  configure_logging()?;
  let cfg = config::parse_cmdline_args()?;
  let aws_config = config::load_aws_config().await;
  let email_config = cfg.email_config();

  let db = database::client::DatabaseClient::new(&aws_config);
  let blob_client = BlobServiceClient::new(cfg.blob_service_url.clone());
  let reports_service = ReportsService::new(db, blob_client, email_config);
  let auth_service = AuthService::new(&aws_config, &cfg.identity_endpoint);

  crate::http::run_http_server(reports_service, auth_service).await
}
