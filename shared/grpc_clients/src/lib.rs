pub mod error;
pub mod identity;
pub mod tunnelbroker;

// Re-export some dependencies which may need to be used by downstream crates
pub use tonic;

use error::Error;
use tonic::transport::Channel;
use tracing::info;

pub(crate) async fn get_grpc_service_channel(
  url: &str,
) -> Result<Channel, Error> {
  info!("Connecting to gRPC service at {}", url);
  let channel = Channel::from_shared(url.to_string())?;

  Ok(channel.connect().await?)
}
