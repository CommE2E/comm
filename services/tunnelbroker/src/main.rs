pub mod constants;
pub mod cxx_bridge;
pub mod server;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
  cxx_bridge::ffi::initialize();
  server::run_grpc_server().await
}
