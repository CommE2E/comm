use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tonic::{transport::Channel, Response, Status};

use identity::{
  get_user_id_request::AuthType,
  identity_service_client::IdentityServiceClient, GetUserIdRequest,
  GetUserIdResponse, VerifyUserTokenRequest, VerifyUserTokenResponse,
};
pub mod identity {
  tonic::include_proto!("identity");
}

const IDENTITY_SERVICE_SOCKET_ADDR: &str = "[::1]:50051";

lazy_static! {
  pub static ref RUNTIME: Arc<Runtime> = Arc::new(
    Builder::new_multi_thread()
      .worker_threads(1)
      .max_blocking_threads(1)
      .enable_all()
      .build()
      .unwrap()
  );
}

pub struct Client {
  identity_client: IdentityServiceClient<Channel>,
}

impl Client {
  async fn new() -> Self {
    Self {
      identity_client: IdentityServiceClient::connect(
        IDENTITY_SERVICE_SOCKET_ADDR,
      )
      .await
      .unwrap(),
    }
  }

  async fn get_user_id(
    &mut self,
    auth_type: AuthType,
    user_info: String,
  ) -> Result<Response<GetUserIdResponse>, Status> {
    self
      .identity_client
      .get_user_id(GetUserIdRequest {
        auth_type: auth_type.into(),
        user_info,
      })
      .await
  }

  async fn verify_user_token(
    &mut self,
    user_id: String,
    device_id: String,
    access_token: String,
  ) -> Result<Response<VerifyUserTokenResponse>, Status> {
    self
      .identity_client
      .verify_user_token(VerifyUserTokenRequest {
        user_id,
        device_id,
        access_token,
      })
      .await
  }
}
