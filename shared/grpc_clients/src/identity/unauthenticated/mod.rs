pub mod client;

use tonic::codegen::InterceptedService;
use tonic::transport::Channel;

use super::{
  protos::unauth::identity_client_service_client::IdentityClientServiceClient,
  shared::CodeVersionLayer, PlatformMetadata,
};
use crate::error::Error;

pub async fn get_unauthenticated_client(
  url: &str,
  platform_metadata: PlatformMetadata,
) -> Result<
  IdentityClientServiceClient<InterceptedService<Channel, CodeVersionLayer>>,
  Error,
> {
  let channel = crate::get_grpc_service_channel(url).await?;
  let version_interceptor = CodeVersionLayer::from(platform_metadata);
  Ok(IdentityClientServiceClient::with_interceptor(
    channel,
    version_interceptor,
  ))
}
