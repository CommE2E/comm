use std::str::FromStr;

pub mod client_proto {
  tonic::include_proto!("identity.client");
}

use crate::{
  config::CONFIG,
  database::{DatabaseClient, KeyPayload},
  nonce::generate_nonce_data,
  service::handle_db_error,
  token::AccessTokenData,
};
use client_proto::{
  DeleteUserRequest, Empty, GenerateNonceResponse, KeyserverKeysRequest,
  KeyserverKeysResponse, OpaqueLoginFinishRequest, OpaqueLoginFinishResponse,
  OpaqueLoginStartRequest, OpaqueLoginStartResponse,
  ReceiverKeysForUserRequest, ReceiverKeysForUserResponse,
  RefreshUserPreKeysRequest, RegistrationFinishRequest,
  RegistrationFinishResponse, RegistrationStartRequest,
  RegistrationStartResponse, SenderKeysForUserRequest,
  SenderKeysForUserResponse, UpdateUserPasswordFinishRequest,
  UpdateUserPasswordFinishResponse, UpdateUserPasswordStartRequest,
  UpdateUserPasswordStartResponse, UploadOneTimeKeysRequest,
  WalletLoginRequest, WalletLoginResponse,
};

use comm_opaque2;
use comm_opaque2::grpc::protocol_error_to_grpc_status;

pub use client_proto::identity_client_service_server::{
  IdentityClientService, IdentityClientServiceServer,
};
use rand::rngs::OsRng;
use tonic::{Response, Status};

#[derive(derive_more::Constructor)]
pub struct ClientService {
  client: DatabaseClient,
}

#[tonic::async_trait]
impl IdentityClientService for ClientService {
  async fn register_password_user_start(
    &self,
    request: tonic::Request<RegistrationStartRequest>,
  ) -> Result<tonic::Response<RegistrationStartResponse>, tonic::Status> {
    let message = request.into_inner();
    let username_available = self
      .client
      .username_available(message.username.clone())
      .await
      .map_err(handle_db_error)?;

    if !username_available {
      return Err(tonic::Status::already_exists("Username already taken"));
    };

    match message {
      client_proto::RegistrationStartRequest {
        opaque_registration_request: register_message,
        username,
        device_key_upload:
          Some(client_proto::DeviceKeyUpload {
            device_key_info:
              Some(client_proto::IdentityKeyInfo {
                payload,
                payload_signature,
                social_proof: _social_proof,
              }),
            identity_upload:
              Some(client_proto::PreKey {
                pre_key: identity_prekey,
                pre_key_signature: identity_prekey_signature,
              }),
            notif_upload:
              Some(client_proto::PreKey {
                pre_key: notif_prekey,
                pre_key_signature: notif_prekey_signature,
              }),
            onetime_identity_prekeys,
            onetime_notif_prekeys,
          }),
      } => {
        let server_register = comm_opaque2::server::Registration::new();
        let server_message = server_register
          .start(
            &CONFIG.server_setup,
            &register_message,
            &username.as_bytes(),
          )
          .map_err(comm_opaque2::grpc::protocol_error_to_grpc_status)?;

        let key_info = KeyPayload::from_str(&payload)
          .map_err(|_| Status::invalid_argument("Malformed key payload"))?;

        let user_id = self
          .client
          .add_user_to_opaque2_users_table(
            username,
            key_info.primary_identity_public_keys.curve25519,
            payload,
            payload_signature,
            identity_prekey,
            identity_prekey_signature,
            onetime_identity_prekeys,
            notif_prekey,
            notif_prekey_signature,
            onetime_notif_prekeys,
          )
          .await
          .map_err(handle_db_error)?;

        let response = RegistrationStartResponse {
          session_id: user_id,
          opaque_registration_response: server_message,
        };
        Ok(Response::new(response))
      }
      _ => Err(tonic::Status::invalid_argument("Unexpected message data")),
    }
  }

  // Called by client when they respond to opaque password registration challenge.
  // Finishes opaque protocol and writes user's password file to DDB
  // and returns access token to user.
  async fn register_password_user_finish(
    &self,
    request: tonic::Request<RegistrationFinishRequest>,
  ) -> Result<tonic::Response<RegistrationFinishResponse>, tonic::Status> {
    let message = request.into_inner();

    let server_register = comm_opaque2::server::Registration::new();
    let password_file = server_register
      .finish(&message.opaque_registration_upload)
      .map_err(protocol_error_to_grpc_status)?;

    self
      .client
      .set_password_file_for_user(&message.session_id, password_file)
      .await
      .map_err(handle_db_error)?;

    // Get user device information, access token is device specific
    let device_id = self
      .client
      .get_user_devices(&message.session_id)
      .await
      .map_err(handle_db_error)?
      .item
      .ok_or(Status::invalid_argument("Missing a device list"))?
      .keys()
      .next()
      .ok_or(Status::invalid_argument("Missing a device in device list"))?
      .to_string();

    // Create access token
    let token = AccessTokenData::new(
      message.session_id,
      device_id,
      crate::token::AuthType::Password,
      &mut OsRng,
    );

    let access_token = token.access_token.clone();

    self
      .client
      .put_access_token_data(token)
      .await
      .map_err(handle_db_error)?;

    let response = RegistrationFinishResponse { access_token };
    Ok(Response::new(response))
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
    let nonce_data = generate_nonce_data(&mut OsRng);
    match self
      .client
      .add_nonce_to_nonces_table(nonce_data.clone())
      .await
    {
      Ok(_) => Ok(Response::new(GenerateNonceResponse {
        nonce: nonce_data.nonce,
      })),
      Err(e) => Err(handle_db_error(e)),
    }
  }

  async fn get_receiver_keys_for_user(
    &self,
    _request: tonic::Request<ReceiverKeysForUserRequest>,
  ) -> Result<tonic::Response<ReceiverKeysForUserResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn get_sender_keys_for_user(
    &self,
    _request: tonic::Request<SenderKeysForUserRequest>,
  ) -> Result<tonic::Response<SenderKeysForUserResponse>, tonic::Status> {
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
