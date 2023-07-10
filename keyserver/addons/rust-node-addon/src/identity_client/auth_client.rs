pub mod client {
  tonic::include_proto!("identity.client");
}
pub mod auth_proto {
  tonic::include_proto!("identity.authenticated");
}
use auth_proto::identity_client_service_client::IdentityClientServiceClient as AuthClient;
use tonic::{
  codegen::InterceptedService,
  metadata::{errors::InvalidMetadataValue, Ascii, MetadataValue},
  service::Interceptor,
  transport::{Channel, Endpoint},
  Request, Status,
};

use super::IDENTITY_SERVICE_CONFIG;

pub struct AuthLayer {
  user_id: String,
  device_id: String,
  access_token: String,
}

trait ToAscii {
  fn parse_to_ascii(&self) -> Result<MetadataValue<Ascii>, Status>;
}

impl ToAscii for str {
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
  user_id: String,
  device_id: String,
  access_token: String,
) -> AuthClient<InterceptedService<Channel, AuthLayer>> {
  let channel =
    Endpoint::from_static(&IDENTITY_SERVICE_CONFIG.identity_socket_addr)
      .connect()
      .await
      .unwrap();

  let interceptor = AuthLayer {
    user_id,
    device_id,
    access_token,
  };

  AuthClient::with_interceptor(channel, interceptor)
}
