pub mod constants;
pub mod database;
pub mod s3;
pub mod service;
pub mod tools;

use anyhow::Result;
use aws_sdk_dynamodb::{Endpoint, Region};
use database::DatabaseClient;
use service::{blob::blob_service_server::BlobServiceServer, MyBlobService};
use std::net::SocketAddr;
use tonic::transport::{Server, Uri};
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

async fn get_aws_config() -> aws_types::SdkConfig {
  let mut config_builder =
    aws_config::from_env().region(Region::new(constants::AWS_REGION));

  if tools::is_sandbox_env() {
    info!("Running in sandbox environment");
    config_builder = config_builder.endpoint_resolver(Endpoint::immutable(
      Uri::from_static(constants::LOCALSTACK_URL),
    ));
  }

  return config_builder.load().await;
}

async fn run_grpc_server(
  db_client: DatabaseClient,
  s3_client: aws_sdk_s3::Client,
) -> Result<()> {
  let addr: SocketAddr =
    format!("[::]:{}", constants::GRPC_SERVER_DEFAULT_PORT).parse()?;
  let blob_service = MyBlobService::new(db_client, s3_client);

  info!("Starting gRPC server listening at {}", addr.to_string());
  Server::builder()
    .add_service(BlobServiceServer::new(blob_service))
    .serve(addr)
    .await?;

  Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
  configure_logging()?;

  let aws_config = get_aws_config().await;
  let db = database::DatabaseClient::new(&aws_config);
  let s3 = aws_sdk_s3::Client::new(&aws_config);

  run_grpc_server(db, s3).await
}
