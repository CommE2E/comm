pub mod constants;
pub mod service;

use anyhow::Result;
use service::{blob::blob_service_server::BlobServiceServer, MyBlobService};
use std::net::SocketAddr;
use tonic::transport::Server;

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
