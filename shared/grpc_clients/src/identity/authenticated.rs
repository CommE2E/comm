use super::{
  protos::authenticated::identity_client_service_client::IdentityClientServiceClient as AuthClient,
  PlatformMetadata,
};
use tonic::{
  codegen::InterceptedService,
  metadata::{errors::InvalidMetadataValue, Ascii, MetadataValue},
  service::Interceptor,
  transport::Channel,
  Request, Status,
};

use crate::identity::shared::{ChainedInterceptor, ToMetadataValueAscii};
use crate::{error::Error, identity::shared::CodeVersionLayer};

pub struct AuthLayer {
  user_id: String,
  device_id: String,
  access_token: String,
}

pub struct ServicesAuthLayer {
  services_token: String,
}

impl ToMetadataValueAscii for str {
  fn parse_to_ascii(&self) -> Result<MetadataValue<Ascii>, Status> {
    self.parse().map_err(|_: InvalidMetadataValue| {
      Status::invalid_argument("non_ascii_character_in_metadata_value")
    })
  }
}

impl Interceptor for AuthLayer {
  fn call(&mut self, mut request: Request<()>) -> Result<Request<()>, Status> {
    let metadata = request.metadata_mut();
    metadata.insert("user_id", self.user_id.parse_to_ascii()?);
    metadata.insert("device_id", self.device_id.parse_to_ascii()?);
    metadata.insert("access_token", self.access_token.parse_to_ascii()?);

    Ok(request)
  }
}

impl Interceptor for ServicesAuthLayer {
  fn call(&mut self, mut request: Request<()>) -> Result<Request<()>, Status> {
    request
      .metadata_mut()
      .insert("services_token", self.services_token.parse_to_ascii()?);

    Ok(request)
  }
}

pub type ChainedInterceptedAuthClient = AuthClient<
  InterceptedService<Channel, ChainedInterceptor<AuthLayer, CodeVersionLayer>>,
>;
pub type ChainedInterceptedServicesAuthClient = AuthClient<
  InterceptedService<
    Channel,
    ChainedInterceptor<ServicesAuthLayer, CodeVersionLayer>,
  >,
>;

pub async fn get_auth_client(
  url: &str,
  user_id: String,
  device_id: String,
  access_token: String,
  platform_metadata: PlatformMetadata,
) -> Result<ChainedInterceptedAuthClient, Error> {
  use crate::get_grpc_service_channel;

  let channel = get_grpc_service_channel(url).await?;

  let auth_interceptor = AuthLayer {
    user_id,
    device_id,
    access_token,
  };

  let version_interceptor = CodeVersionLayer::from(platform_metadata);

  let chained = ChainedInterceptor {
    first: auth_interceptor,
    second: version_interceptor,
  };

  Ok(AuthClient::with_interceptor(channel, chained))
}

pub async fn get_services_auth_client(
  url: &str,
  services_token: String,
  platform_metadata: PlatformMetadata,
) -> Result<ChainedInterceptedServicesAuthClient, Error> {
  use crate::get_grpc_service_channel;

  let channel = get_grpc_service_channel(url).await?;

  let auth_interceptor = ServicesAuthLayer { services_token };

  let version_interceptor = CodeVersionLayer::from(platform_metadata);

  let chained = ChainedInterceptor {
    first: auth_interceptor,
    second: version_interceptor,
  };

  Ok(AuthClient::with_interceptor(channel, chained))
}
