pub mod protos {
  tonic::include_proto!("tunnelbroker");
}
use protos::tunnelbroker_service_client::TunnelbrokerServiceClient;
use tonic::transport::Channel;

use crate::error::Error;

pub async fn create_tunnelbroker_client(
  url: &str,
) -> Result<TunnelbrokerServiceClient<Channel>, Error> {
  let channel = crate::get_grpc_service_channel(url).await?;
  Ok(TunnelbrokerServiceClient::new(channel))
}
