pub mod constants;
pub mod database;
pub mod s3;
pub mod service;
pub mod tools;

use anyhow::Result;
use aws_sdk_dynamodb::{Endpoint, Region};
use service::{blob::blob_service_server::BlobServiceServer, MyBlobService};
use std::net::SocketAddr;
use tonic::transport::{Server, Uri};

async fn _get_aws_config() -> aws_types::SdkConfig {
  let mut config_builder =
    aws_config::from_env().region(Region::new(constants::AWS_REGION));

  if tools::is_sandbox_env() {
    config_builder = config_builder.endpoint_resolver(Endpoint::immutable(
      Uri::from_static(constants::LOCALSTACK_URL),
    ));
  }

  return config_builder.load().await;
}

async fn run_grpc_server() -> Result<()> {
  let addr: SocketAddr =
    format!("[::]:{}", constants::GRPC_SERVER_DEFAULT_PORT).parse()?;
  let blob_service = MyBlobService::default();

  println!("Starting gRPC server at port {}", addr.port());
  Server::builder()
    .add_service(BlobServiceServer::new(blob_service))
    .serve(addr)
    .await?;

  Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
  run_grpc_server().await
}
