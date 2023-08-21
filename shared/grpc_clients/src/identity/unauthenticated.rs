use tonic::transport::Channel;

use super::protos::client::identity_client_service_client::IdentityClientServiceClient;
use crate::error::Error;

pub async fn get_unauthenticated_client(
  url: &str,
) -> Result<IdentityClientServiceClient<Channel>, Error> {
  let channel = crate::get_grpc_service_channel(url).await?;
  Ok(IdentityClientServiceClient::new(channel))
}
