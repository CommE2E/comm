pub mod client;

use tonic::codegen::InterceptedService;
use tonic::transport::Channel;

use super::{
  protos::client::identity_client_service_client::IdentityClientServiceClient,
  shared::CodeVersionLayer,
};
use crate::error::Error;

pub async fn get_unauthenticated_client(
  url: &str,
  code_version: u64,
  device_type: String,
) -> Result<
  IdentityClientServiceClient<InterceptedService<Channel, CodeVersionLayer>>,
  Error,
> {
  let channel = crate::get_grpc_service_channel(url).await?;
  let version_interceptor = CodeVersionLayer {
    version: code_version,
    device_type,
  };
  Ok(IdentityClientServiceClient::with_interceptor(
    channel,
    version_interceptor,
  ))
}
