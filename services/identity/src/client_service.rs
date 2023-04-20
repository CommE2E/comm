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
    UpdateUserPasswordStartRequest, UpdateUserPasswordStartResponse,
    UploadOneTimeKeysRequest, VerifyUserAccessTokenRequest,
    VerifyUserAccessTokenResponse, WalletLoginRequest, WalletLoginResponse,
  },
  config::CONFIG,
  database::{DatabaseClient, Error as DBError, KeyPayload},
  id::generate_uuid,
  nonce::generate_nonce_data,
  siwe::parse_and_verify_siwe_message,
  token::{AccessTokenData, AuthType},
};
use aws_sdk_dynamodb::Error as DynamoDBError;
pub use client_proto::identity_client_service_server::{
  IdentityClientService, IdentityClientServiceServer,
};
use comm_opaque2::grpc::protocol_error_to_grpc_status;
use constant_time_eq::constant_time_eq;
use moka::future::Cache;
use rand::rngs::OsRng;
use tonic::Response;
use tracing::error;

#[derive(Clone)]
pub enum WorkflowInProgress {
  Registration(UserRegistrationInfo),
  Login(UserLoginInfo),
  Update(UpdateState),
}

#[derive(Clone)]
pub struct UserRegistrationInfo {
  pub username: String,
  pub flattened_device_key_upload: FlattenedDeviceKeyUpload,
}

#[derive(Clone)]
pub struct UserLoginInfo {
  pub user_id: String,
  pub flattened_device_key_upload: FlattenedDeviceKeyUpload,
  pub opaque_server_login: comm_opaque2::server::Login,
}

#[derive(Clone)]
pub struct UpdateState {
  pub user_id: String,
}

#[derive(Clone)]
pub struct FlattenedDeviceKeyUpload {
  pub device_id_key: String,
  pub key_payload: String,
  pub key_payload_signature: String,
  pub identity_prekey: String,
  pub identity_prekey_signature: String,
  pub identity_onetime_keys: Vec<String>,
  pub notif_prekey: String,
  pub notif_prekey_signature: String,
  pub notif_onetime_keys: Vec<String>,
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
        .map_err(protocol_error_to_grpc_status)?;
      let key_info = KeyPayload::from_str(&payload)
        .map_err(|_| tonic::Status::invalid_argument("malformed payload"))?;
      let registration_state = UserRegistrationInfo {
        username,
        flattened_device_key_upload: FlattenedDeviceKeyUpload {
          device_id_key: key_info.primary_identity_public_keys.curve25519,
          key_payload: payload,
          key_payload_signature: payload_signature,
          identity_prekey,
          identity_prekey_signature,
          identity_onetime_keys: onetime_identity_prekeys,
          notif_prekey,
          notif_prekey_signature,
          notif_onetime_keys: onetime_notif_prekeys,
        },
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
    request: tonic::Request<RegistrationFinishRequest>,
  ) -> Result<tonic::Response<RegistrationFinishResponse>, tonic::Status> {
    let message = request.into_inner();

    if let Some(WorkflowInProgress::Registration(state)) =
      self.cache.get(&message.session_id)
    {
      self.cache.invalidate(&message.session_id).await;

      let server_registration = comm_opaque2::server::Registration::new();
      let password_file = server_registration
        .finish(&message.opaque_registration_upload)
        .map_err(protocol_error_to_grpc_status)?;

      let device_id = state.flattened_device_key_upload.device_id_key.clone();
      let user_id = self
        .client
        .add_password_user_to_users_table(state, password_file)
        .await
        .map_err(handle_db_error)?;

      // Create access token
      let token = AccessTokenData::new(
        user_id.clone(),
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

      let response = RegistrationFinishResponse {
        user_id,
        access_token,
      };
      Ok(Response::new(response))
    } else {
      Err(tonic::Status::not_found("session not found"))
    }
  }

  async fn update_user_password_start(
    &self,
    request: tonic::Request<UpdateUserPasswordStartRequest>,
  ) -> Result<tonic::Response<UpdateUserPasswordStartResponse>, tonic::Status>
  {
    let message = request.into_inner();

    let access_token = self
      .client
      .get_access_token_data(message.user_id.clone(), message.device_id_key)
      .await
      .map_err(handle_db_error)?;

    if let Some(token) = access_token {
      if !token.is_valid()
        || !constant_time_eq(
          token.access_token.as_bytes(),
          message.access_token.as_bytes(),
        )
      {
        return Err(tonic::Status::permission_denied("bad token"));
      }

      let server_registration = comm_opaque2::server::Registration::new();
      let server_message = server_registration
        .start(
          &CONFIG.server_setup,
          &message.opaque_registration_request,
          message.user_id.as_bytes(),
        )
        .map_err(protocol_error_to_grpc_status)?;

      let update_state = UpdateState {
        user_id: message.user_id,
      };
      let session_id = generate_uuid();
      self
        .cache
        .insert(session_id.clone(), WorkflowInProgress::Update(update_state))
        .await;

      let response = UpdateUserPasswordStartResponse {
        session_id,
        opaque_registration_response: server_message,
      };
      Ok(Response::new(response))
    } else {
      Err(tonic::Status::permission_denied("bad token"))
    }
  }

  async fn update_user_password_finish(
    &self,
    request: tonic::Request<UpdateUserPasswordFinishRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    if let Some(WorkflowInProgress::Update(state)) =
      self.cache.get(&message.session_id)
    {
      self.cache.invalidate(&message.session_id).await;

      let server_registration = comm_opaque2::server::Registration::new();
      let password_file = server_registration
        .finish(&message.opaque_registration_upload)
        .map_err(protocol_error_to_grpc_status)?;

      self
        .client
        .update_user_password(state.user_id, password_file)
        .await
        .map_err(handle_db_error)?;

      let response = Empty {};
      Ok(Response::new(response))
    } else {
      Err(tonic::Status::not_found("session not found"))
    }
  }

  async fn login_password_user_start(
    &self,
    request: tonic::Request<OpaqueLoginStartRequest>,
  ) -> Result<tonic::Response<OpaqueLoginStartResponse>, tonic::Status> {
    let message = request.into_inner();

    let (user_id, password_file_bytes) = self
      .client
      .get_user_id_and_password_file_from_username(&message.username)
      .await
      .map_err(handle_db_error)?
      .ok_or(tonic::Status::not_found("user not found"))?;

    if let client_proto::OpaqueLoginStartRequest {
      opaque_login_request: login_message,
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
      let mut server_login = comm_opaque2::server::Login::new();
      let server_response = server_login
        .start(
          &CONFIG.server_setup,
          &password_file_bytes,
          &login_message,
          username.as_bytes(),
        )
        .map_err(protocol_error_to_grpc_status)?;

      let key_info = KeyPayload::from_str(&payload)
        .map_err(|_| tonic::Status::invalid_argument("malformed payload"))?;
      let login_state = UserLoginInfo {
        user_id,
        opaque_server_login: server_login,
        flattened_device_key_upload: FlattenedDeviceKeyUpload {
          device_id_key: key_info.primary_identity_public_keys.curve25519,
          key_payload: payload,
          key_payload_signature: payload_signature,
          identity_prekey,
          identity_prekey_signature,
          identity_onetime_keys: onetime_identity_prekeys,
          notif_prekey,
          notif_prekey_signature,
          notif_onetime_keys: onetime_notif_prekeys,
        },
      };
      let session_id = generate_uuid();
      self
        .cache
        .insert(session_id.clone(), WorkflowInProgress::Login(login_state))
        .await;

      let response = Response::new(OpaqueLoginStartResponse {
        session_id,
        opaque_login_response: server_response,
      });
      Ok(response)
    } else {
      Err(tonic::Status::invalid_argument("unexpected message data"))
    }
  }

  async fn login_password_user_finish(
    &self,
    request: tonic::Request<OpaqueLoginFinishRequest>,
  ) -> Result<tonic::Response<OpaqueLoginFinishResponse>, tonic::Status> {
    let message = request.into_inner();

    if let Some(WorkflowInProgress::Login(state)) =
      self.cache.get(&message.session_id)
    {
      self.cache.invalidate(&message.session_id).await;

      let mut server_login = state.opaque_server_login.clone();
      server_login
        .finish(&message.opaque_login_upload)
        .map_err(protocol_error_to_grpc_status)?;

      self
        .client
        .add_password_user_device_to_users_table(
          state.user_id.clone(),
          state.flattened_device_key_upload.clone(),
        )
        .await
        .map_err(handle_db_error)?;

      // Create access token
      let token = AccessTokenData::new(
        state.user_id.clone(),
        state.flattened_device_key_upload.device_id_key,
        crate::token::AuthType::Password,
        &mut OsRng,
      );

      let access_token = token.access_token.clone();

      self
        .client
        .put_access_token_data(token)
        .await
        .map_err(handle_db_error)?;

      let response = OpaqueLoginFinishResponse {
        user_id: state.user_id,
        access_token,
      };
      Ok(Response::new(response))
    } else {
      Err(tonic::Status::not_found("session not found"))
    }
  }

  async fn login_wallet_user(
    &self,
    request: tonic::Request<WalletLoginRequest>,
  ) -> Result<tonic::Response<WalletLoginResponse>, tonic::Status> {
    let message = request.into_inner();

    let wallet_address = parse_and_verify_siwe_message(
      &message.siwe_message,
      &message.siwe_signature,
    )?;

    let (flattened_device_key_upload, social_proof) =
      if let client_proto::WalletLoginRequest {
        siwe_message: _,
        siwe_signature: _,
        device_key_upload:
          Some(client_proto::DeviceKeyUpload {
            device_key_info:
              Some(client_proto::IdentityKeyInfo {
                payload,
                payload_signature,
                social_proof: Some(social_proof),
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
        let key_info = KeyPayload::from_str(&payload)
          .map_err(|_| tonic::Status::invalid_argument("malformed payload"))?;
        (
          FlattenedDeviceKeyUpload {
            device_id_key: key_info.primary_identity_public_keys.curve25519,
            key_payload: payload,
            key_payload_signature: payload_signature,
            identity_prekey,
            identity_prekey_signature,
            identity_onetime_keys: onetime_identity_prekeys,
            notif_prekey,
            notif_prekey_signature,
            notif_onetime_keys: onetime_notif_prekeys,
          },
          social_proof,
        )
      } else {
        return Err(tonic::Status::invalid_argument("unexpected message data"));
      };

    let user_id = match self
      .client
      .get_user_id_from_user_info(wallet_address.clone(), AuthType::Wallet)
      .await
      .map_err(handle_db_error)?
    {
      Some(id) => {
        // User already exists, so we should update the DDB item
        self
          .client
          .add_wallet_user_device_to_users_table(
            id.clone(),
            flattened_device_key_upload.clone(),
            social_proof,
          )
          .await
          .map_err(handle_db_error)?;
        id
      }
      None => {
        // User doesn't exist yet, so we should add a new user in DDB
        self
          .client
          .add_wallet_user_to_users_table(
            flattened_device_key_upload.clone(),
            wallet_address,
            social_proof,
          )
          .await
          .map_err(handle_db_error)?
      }
    };

    // Create access token
    let token = AccessTokenData::new(
      user_id.clone(),
      flattened_device_key_upload.device_id_key,
      crate::token::AuthType::Password,
      &mut OsRng,
    );

    let access_token = token.access_token.clone();

    self
      .client
      .put_access_token_data(token)
      .await
      .map_err(handle_db_error)?;

    let response = WalletLoginResponse {
      user_id,
      access_token,
    };
    Ok(Response::new(response))
  }

  async fn delete_user(
    &self,
    request: tonic::Request<DeleteUserRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    let access_token = self
      .client
      .get_access_token_data(message.user_id.clone(), message.device_id_key)
      .await
      .map_err(handle_db_error)?;

    if let Some(token) = access_token {
      if !token.is_valid()
        || !constant_time_eq(
          token.access_token.as_bytes(),
          message.access_token.as_bytes(),
        )
      {
        return Err(tonic::Status::permission_denied("bad token"));
      }

      self
        .client
        .delete_user(message.user_id)
        .await
        .map_err(handle_db_error)?;

      let response = Empty {};

      Ok(Response::new(response))
    } else {
      Err(tonic::Status::permission_denied("bad token"))
    }
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
    request: tonic::Request<VerifyUserAccessTokenRequest>,
  ) -> Result<tonic::Response<VerifyUserAccessTokenResponse>, tonic::Status> {
    let message = request.into_inner();
    let token_valid = match self
      .client
      .get_access_token_data(message.user_id, message.signing_public_key)
      .await
    {
      Ok(Some(access_token_data)) => {
        constant_time_eq(
          access_token_data.access_token.as_bytes(),
          message.access_token.as_bytes(),
        ) && access_token_data.is_valid()
      }
      Ok(None) => false,
      Err(e) => return Err(handle_db_error(e)),
    };
    let response = Response::new(VerifyUserAccessTokenResponse { token_valid });
    Ok(response)
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
