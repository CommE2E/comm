use super::protos::authenticated::identity_client_service_client::IdentityClientServiceClient as AuthClient;
use tonic::{
  codegen::InterceptedService,
  metadata::{errors::InvalidMetadataValue, Ascii, MetadataValue},
  service::Interceptor,
  transport::Channel,
  Request, Status,
};

use crate::error::Error;

pub struct AuthLayer {
  user_id: String,
  device_id: String,
  access_token: String,
}

trait ToMetadataValueAscii {
  fn parse_to_ascii(&self) -> Result<MetadataValue<Ascii>, Status>;
}

impl ToMetadataValueAscii for str {
  fn parse_to_ascii(&self) -> Result<MetadataValue<Ascii>, Status> {
    self.parse().map_err(|e: InvalidMetadataValue| {
      Status::invalid_argument(format!(
        "Non-Ascii character present in metadata value: {}",
        e
      ))
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
pub async fn get_auth_client(
  url: &str,
  user_id: String,
  device_id: String,
  access_token: String,
) -> Result<AuthClient<InterceptedService<Channel, AuthLayer>>, Error> {
  use crate::get_grpc_service_channel;

  let channel = get_grpc_service_channel(url).await?;

  let interceptor = AuthLayer {
    user_id,
    device_id,
    access_token,
  };

  Ok(AuthClient::with_interceptor(channel, interceptor))
}
