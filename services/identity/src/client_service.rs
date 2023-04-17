pub mod client_proto {
  tonic::include_proto!("identity.client");
}

use std::str::FromStr;

use crate::{
  client_service::client_proto::{
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
    VerifyUserAccessTokenRequest, VerifyUserAccessTokenResponse,
    WalletLoginRequest, WalletLoginResponse,
  },
  config::CONFIG,
  database::{DatabaseClient, Error as DBError, KeyPayload},
  id::generate_uuid,
  nonce::generate_nonce_data,
};
use aws_sdk_dynamodb::Error as DynamoDBError;
pub use client_proto::identity_client_service_server::{
  IdentityClientService, IdentityClientServiceServer,
};
use moka::future::Cache;
use rand::rngs::OsRng;
use tonic::Response;
use tracing::error;

#[derive(Clone)]
pub enum WorkflowInProgress {
  Registration(UserRegistrationInfo),
}

#[derive(Clone)]
pub struct UserRegistrationInfo {
  username: String,
  device_id_key: String,
  key_payload: String,
  key_payload_signature: String,
  identity_prekey: String,
  identity_prekey_signature: String,
  identity_onetime_keys: Vec<String>,
  notif_prekey: String,
  notif_prekey_signature: String,
  notif_onetime_keys: Vec<String>,
}

#[derive(derive_more::Constructor)]
pub struct ClientService {
  client: DatabaseClient,
  cache: Cache<String, WorkflowInProgress>,
}

#[tonic::async_trait]
impl IdentityClientService for ClientService {
  async fn register_password_user_start(
    &self,
    request: tonic::Request<RegistrationStartRequest>,
  ) -> Result<tonic::Response<RegistrationStartResponse>, tonic::Status> {
    let message = request.into_inner();
    let username_taken = self
      .client
      .username_taken(message.username.clone())
      .await
      .map_err(handle_db_error)?;

    if username_taken {
      return Err(tonic::Status::already_exists("username already exists"));
    }

    if CONFIG.reserved_usernames.contains(&message.username) {
      return Err(tonic::Status::invalid_argument("username reserved"));
    }

    if let client_proto::RegistrationStartRequest {
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
    } = message
    {
      let server_registration = comm_opaque2::server::Registration::new();
      let server_message = server_registration
        .start(&CONFIG.server_setup, &register_message, username.as_bytes())
        .map_err(comm_opaque2::grpc::protocol_error_to_grpc_status)?;
      let key_info = KeyPayload::from_str(&payload)
        .map_err(|_| tonic::Status::invalid_argument("malformed payload"))?;
      let registration_state = UserRegistrationInfo {
        username,
        device_id_key: key_info.primary_identity_public_keys.curve25519,
        key_payload: payload,
        key_payload_signature: payload_signature,
        identity_prekey,
        identity_prekey_signature,
        identity_onetime_keys: onetime_identity_prekeys,
        notif_prekey,
        notif_prekey_signature,
        notif_onetime_keys: onetime_notif_prekeys,
      };
      let session_id = generate_uuid();
      self
        .cache
        .insert(
          session_id.clone(),
          WorkflowInProgress::Registration(registration_state),
        )
        .await;

      let response = RegistrationStartResponse {
        session_id,
        opaque_registration_response: server_message,
      };
      Ok(Response::new(response))
    } else {
      Err(tonic::Status::invalid_argument("unexpected message data"))
    }
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

  async fn verify_user_access_token(
    &self,
    _request: tonic::Request<VerifyUserAccessTokenRequest>,
  ) -> Result<tonic::Response<VerifyUserAccessTokenResponse>, tonic::Status> {
    unimplemented!();
  }
}

pub fn handle_db_error(db_error: DBError) -> tonic::Status {
  match db_error {
    DBError::AwsSdk(DynamoDBError::InternalServerError(_))
    | DBError::AwsSdk(DynamoDBError::ProvisionedThroughputExceededException(
      _,
    ))
    | DBError::AwsSdk(DynamoDBError::RequestLimitExceeded(_)) => {
      tonic::Status::unavailable("please retry")
    }
    e => {
      error!("Encountered an unexpected error: {}", e);
      tonic::Status::failed_precondition("unexpected error")
    }
  }
}
