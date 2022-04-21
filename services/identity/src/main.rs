use tonic::transport::Server;

mod service;
use service::{IdentityServiceServer, MyIdentityService};

const IDENTITY_SERVICE_SOCKET_ADDR: &str = "[::]:50051";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
  let addr = IDENTITY_SERVICE_SOCKET_ADDR.parse()?;
  let identity_service = MyIdentityService::default();

  Server::builder()
    .add_service(IdentityServiceServer::new(identity_service))
    .serve(addr)
    .await?;

  Ok(())
}
