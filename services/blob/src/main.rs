pub mod config;
pub mod constants;
pub mod database;
pub mod s3;
pub mod service;
pub mod tools;

use anyhow::Result;
use config::CONFIG;
use database::DatabaseClient;
use s3::S3Client;
use service::{blob::blob_service_server::BlobServiceServer, MyBlobService};
use std::net::SocketAddr;
use tonic::transport::Server;
use tracing::info;
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

async fn run_grpc_server(
  db_client: DatabaseClient,
  s3_client: S3Client,
) -> Result<()> {
  let addr: SocketAddr = format!("[::]:{}", CONFIG.grpc_port).parse()?;
  let blob_service = MyBlobService::new(db_client, s3_client);

  info!("Starting gRPC server listening at {}", CONFIG.grpc_port);
  Server::builder()
    .add_service(BlobServiceServer::new(blob_service))
    .serve(addr)
    .await?;

  Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
  configure_logging()?;
  config::parse_cmdline_args();

  let aws_config = config::load_aws_config().await;
  let db = database::DatabaseClient::new(&aws_config);
  let s3 = s3::S3Client::new(&aws_config);

  run_grpc_server(db, s3).await
}
