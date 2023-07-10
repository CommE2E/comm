pub mod client {
  tonic::include_proto!("identity.client");
}
pub mod auth_proto {
  tonic::include_proto!("identity.authenticated");
}
use auth_proto::identity_client_service_client::IdentityClientServiceClient as AuthClient;
use tonic::{
  codegen::InterceptedService,
  service::Interceptor,
  transport::{Channel, Endpoint},
  Request,
};

use super::IDENTITY_SERVICE_CONFIG;

pub struct AuthLayer {
  user_id: String,
  device_id: String,
  access_token: String,
}

impl Interceptor for AuthLayer {
  fn call(
    &mut self,
    mut request: tonic::Request<()>,
  ) -> std::result::Result<Request<()>, tonic::Status> {
    let metadata = request.metadata_mut();
    metadata.append("user_id", self.user_id.parse().unwrap());
    metadata.append("device_id", self.device_id.parse().unwrap());
    metadata.append("access_token", self.access_token.parse().unwrap());

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
