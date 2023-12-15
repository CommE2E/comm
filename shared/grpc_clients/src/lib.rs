pub mod error;
pub mod identity;
pub mod tunnelbroker;

// Re-export some dependencies which may need to be used by downstream crates
pub use tonic;

use error::Error;
use std::time::Duration;
use tonic::transport::Channel;
use tracing::info;

const CONNECT_TIMEOUT_DURATION: Duration = Duration::from_secs(5);

pub(crate) async fn get_grpc_service_channel(
  url: &str,
) -> Result<Channel, Error> {
  info!("Connecting to gRPC service at {}", url);
  let channel = Channel::from_shared(url.to_string())?
    .connect_timeout(CONNECT_TIMEOUT_DURATION);

  Ok(channel.connect().await?)
}
