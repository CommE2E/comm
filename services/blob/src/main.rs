pub mod config;
pub mod constants;
pub mod database;
pub mod grpc;
pub mod s3;
pub mod tools;

use anyhow::Result;
use tracing_subscriber::filter::{EnvFilter, LevelFilter};

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
  config::parse_cmdline_args();

  let aws_config = config::load_aws_config().await;
  let db = database::DatabaseClient::new(&aws_config);
  let s3 = s3::S3Client::new(&aws_config);

  crate::grpc::run_grpc_server(db, s3).await
}
