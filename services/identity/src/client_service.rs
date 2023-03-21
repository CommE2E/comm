pub mod client_proto {
  tonic::include_proto!("identity.client");
}

use crate::client_service::client_proto::{
  DeleteUserRequest, DeviceKeysForUserRequest, DeviceKeysForUserResponse,
  Empty, GenerateNonceResponse, KeyserverKeysRequest, KeyserverKeysResponse,
  OpaqueLoginFinishRequest, OpaqueLoginFinishResponse, OpaqueLoginStartRequest,
  OpaqueLoginStartResponse, RefreshUserPreKeysRequest,
  RegistrationFinishRequest, RegistrationFinishResponse,
  RegistrationStartRequest, RegistrationStartResponse,
  UpdateUserPasswordFinishRequest, UpdateUserPasswordFinishResponse,
  UpdateUserPasswordStartRequest, UpdateUserPasswordStartResponse,
  UploadOneTimeKeysRequest, WalletLoginRequest, WalletLoginResponse,
};
pub use client_proto::identity_client_service_server::{
  IdentityClientService, IdentityClientServiceServer,
};

#[derive(derive_more::Constructor)]
pub struct ClientService {}

#[tonic::async_trait]
impl IdentityClientService for ClientService {
  async fn register_password_user_start(
    &self,
    _request: tonic::Request<RegistrationStartRequest>,
  ) -> Result<tonic::Response<RegistrationStartResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn register_password_user_finish(
    &self,
    _request: tonic::Request<RegistrationFinishRequest>,
  ) -> Result<tonic::Response<RegistrationFinishResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn update_user_password_start(
    &self,
    _request: tonic::Request<UpdateUserPasswordStartRequest>,
  ) -> Result<tonic::Response<UpdateUserPasswordStartResponse>, tonic::Status>
  {
    unimplemented!();
  }

  async fn update_user_password_finish(
    &self,
    _request: tonic::Request<UpdateUserPasswordFinishRequest>,
  ) -> Result<tonic::Response<UpdateUserPasswordFinishResponse>, tonic::Status>
  {
    unimplemented!();
  }

  async fn login_password_user_start(
    &self,
    _request: tonic::Request<OpaqueLoginStartRequest>,
  ) -> Result<tonic::Response<OpaqueLoginStartResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn login_password_user_finish(
    &self,
    _request: tonic::Request<OpaqueLoginFinishRequest>,
  ) -> Result<tonic::Response<OpaqueLoginFinishResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn login_wallet_user(
    &self,
    _request: tonic::Request<WalletLoginRequest>,
  ) -> Result<tonic::Response<WalletLoginResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn delete_user(
    &self,
    _request: tonic::Request<DeleteUserRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    unimplemented!();
  }

  async fn generate_nonce(
    &self,
    _request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<GenerateNonceResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn get_device_keys_for_user(
    &self,
    _request: tonic::Request<DeviceKeysForUserRequest>,
  ) -> Result<tonic::Response<DeviceKeysForUserResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn get_keyserver_keys(
    &self,
    _request: tonic::Request<KeyserverKeysRequest>,
  ) -> Result<tonic::Response<KeyserverKeysResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn upload_one_time_keys(
    &self,
    _request: tonic::Request<UploadOneTimeKeysRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    unimplemented!();
  }

  async fn refresh_user_pre_keys(
    &self,
    _request: tonic::Request<RefreshUserPreKeysRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    unimplemented!();
  }
}
