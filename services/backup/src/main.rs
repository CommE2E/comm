use anyhow::Result;
use std::net::SocketAddr;
use tonic::transport::Server;
use tracing::{info, Level};
use tracing_subscriber::EnvFilter;

use crate::service::{BackupServiceServer, MyBackupService};

pub mod blob;
pub mod config;
pub mod constants;
pub mod database;
pub mod service;

// re-export this to be available as crate::CONFIG
pub use config::CONFIG;

fn configure_logging() -> Result<()> {
  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
  tracing::subscriber::set_global_default(subscriber)?;
  Ok(())
}

async fn run_grpc_server(db: database::DatabaseClient) -> Result<()> {
  let addr: SocketAddr = format!("[::]:{}", CONFIG.listening_port).parse()?;
  let backup_service = MyBackupService::new(db);

  info!("Starting gRPC server listening at {}", addr.to_string());
  Server::builder()
    .add_service(BackupServiceServer::new(backup_service))
    .serve(addr)
    .await?;

  Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
  config::parse_cmdline_args();
  configure_logging()?;

  let aws_config = config::load_aws_config().await;
  let db = database::DatabaseClient::new(&aws_config);

  run_grpc_server(db).await
}
