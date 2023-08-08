// Standard library imports
use std::{str::FromStr};

// External crate imports
use aws_sdk_dynamodb::Error as DynamoDBError;
use comm_opaque2::grpc::protocol_error_to_grpc_status;
use moka::future::Cache;
use rand::rngs::OsRng;
use tonic::Response;
use tracing::{debug, error};

// Workspace crate imports
use crate::client_service::client_proto::{
  AddReservedUsernamesRequest, DeleteUserRequest, Empty, GenerateNonceResponse, InboundKeysForUserRequest,
  InboundKeysForUserResponse, LogoutRequest, OpaqueLoginFinishRequest,
  OpaqueLoginFinishResponse, OpaqueLoginStartRequest, OpaqueLoginStartResponse,
  OutboundKeysForUserRequest, OutboundKeysForUserResponse,
  RefreshUserPreKeysRequest, RegistrationFinishRequest,
  RegistrationFinishResponse, RegistrationStartRequest,
  RegistrationStartResponse, RemoveReservedUsernameRequest,
  ReservedRegistrationStartRequest, UpdateUserPasswordFinishRequest,
  UpdateUserPasswordStartRequest, UpdateUserPasswordStartResponse,
  UploadOneTimeKeysRequest, VerifyUserAccessTokenRequest,
  VerifyUserAccessTokenResponse, WalletLoginRequest, WalletLoginResponse,
};
use crate::config::CONFIG;

use crate::database::{DatabaseClient, Device, KeyPayload};
use crate::error::Error as DBError;
use crate::id::generate_uuid;
use crate::nonce::generate_nonce_data;
use crate::reserved_users::{
  validate_add_reserved_usernames_message,
  validate_remove_reserved_username_message,
  validate_signed_account_ownership_message,
};
use crate::siwe::parse_and_verify_siwe_message;
use crate::token::{AccessTokenData, AuthType};
pub use client_proto::identity_client_service_server::{
  IdentityClientService, IdentityClientServiceServer,
};

pub mod client_proto {
  tonic::include_proto!("identity.client");
}

#[derive(Clone)]
pub enum WorkflowInProgress {
  Registration(Box<UserRegistrationInfo>),
  Login(Box<UserLoginInfo>),
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
  pub content_prekey: String,
  pub content_prekey_signature: String,
  pub content_onetime_keys: Vec<String>,
  pub notif_prekey: String,
  pub notif_prekey_signature: String,
  pub notif_onetime_keys: Vec<String>,
  pub device_type: Device,
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
    debug!("Received registration request for: {}", message.username);

    let username_taken = self
      .client
      .username_taken(message.username.clone())
      .await
      .map_err(handle_db_error)?;
    let username_in_reserved_usernames_table = self
      .client
      .username_in_reserved_usernames_table(&message.username)
      .await
      .map_err(handle_db_error)?;

    if username_taken || username_in_reserved_usernames_table {
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
          content_upload:
            Some(client_proto::PreKey {
              pre_key: content_prekey,
              pre_key_signature: content_prekey_signature,
            }),
          notif_upload:
            Some(client_proto::PreKey {
              pre_key: notif_prekey,
              pre_key_signature: notif_prekey_signature,
            }),
          onetime_content_prekeys,
          onetime_notif_prekeys,
          device_type,
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
          device_id_key: key_info.primary_identity_public_keys.ed25519,
          key_payload: payload,
          key_payload_signature: payload_signature,
          content_prekey,
          content_prekey_signature,
          content_onetime_keys: onetime_content_prekeys,
          notif_prekey,
          notif_prekey_signature,
          notif_onetime_keys: onetime_notif_prekeys,
          device_type: Device::try_from(device_type)
            .map_err(handle_db_error)?,
        },
      };
      let session_id = generate_uuid();
      self
        .cache
        .insert(
          session_id.clone(),
          WorkflowInProgress::Registration(Box::new(registration_state)),
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

  async fn register_reserved_password_user_start(
    &self,
    request: tonic::Request<ReservedRegistrationStartRequest>,
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

    let username_in_reserved_usernames_table = self
      .client
      .username_in_reserved_usernames_table(&message.username)
      .await
      .map_err(handle_db_error)?;
    if username_in_reserved_usernames_table {
      validate_signed_account_ownership_message(
        &message.username,
        &message.keyserver_message,
        &message.keyserver_signature,
      )?;
    } else {
      return Err(tonic::Status::permission_denied("username not reserved"));
    }

    if let client_proto::ReservedRegistrationStartRequest {
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
          content_upload:
            Some(client_proto::PreKey {
              pre_key: content_prekey,
              pre_key_signature: content_prekey_signature,
            }),
          notif_upload:
            Some(client_proto::PreKey {
              pre_key: notif_prekey,
              pre_key_signature: notif_prekey_signature,
            }),
          onetime_content_prekeys,
          onetime_notif_prekeys,
          device_type,
        }),
      ..
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
          device_id_key: key_info.primary_identity_public_keys.ed25519,
          key_payload: payload,
          key_payload_signature: payload_signature,
          content_prekey,
          content_prekey_signature,
          content_onetime_keys: onetime_content_prekeys,
          notif_prekey,
          notif_prekey_signature,
          notif_onetime_keys: onetime_notif_prekeys,
          device_type: Device::try_from(device_type)
            .map_err(handle_db_error)?,
        },
      };

      let session_id = generate_uuid();
      self
        .cache
        .insert(
          session_id.clone(),
          WorkflowInProgress::Registration(Box::new(registration_state)),
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
        .add_password_user_to_users_table(*state, password_file)
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

    let token_is_valid = self
      .client
      .verify_access_token(
        message.user_id.clone(),
        message.device_id_key,
        message.access_token,
      )
      .await
      .map_err(handle_db_error)?;

    if !token_is_valid {
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

    debug!("Attempting to login user: {:?}", &message.username);
    let user_id_and_password_file = self
      .client
      .get_user_id_and_password_file_from_username(&message.username)
      .await
      .map_err(handle_db_error)?;

    let (user_id, password_file_bytes) =
      if let Some(data) = user_id_and_password_file {
        data
      } else {
        // It's possible that the user attempting login is already registered
        // on Ashoat's keyserver. If they are, we should send back a gRPC status
        // code instructing them to get a signed message from Ashoat's keyserver
        // in order to claim their username and register with the Identity
        // service.
        let username_in_reserved_usernames_table = self
          .client
          .username_in_reserved_usernames_table(&message.username)
          .await
          .map_err(handle_db_error)?;

        if username_in_reserved_usernames_table {
          return Err(tonic::Status::failed_precondition(
            "need keyserver message to claim username",
          ));
        }

        return Err(tonic::Status::not_found("user not found"));
      };

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
          content_upload:
            Some(client_proto::PreKey {
              pre_key: content_prekey,
              pre_key_signature: content_prekey_signature,
            }),
          notif_upload:
            Some(client_proto::PreKey {
              pre_key: notif_prekey,
              pre_key_signature: notif_prekey_signature,
            }),
          onetime_content_prekeys,
          onetime_notif_prekeys,
          device_type,
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
          device_id_key: key_info.primary_identity_public_keys.ed25519,
          key_payload: payload,
          key_payload_signature: payload_signature,
          content_prekey,
          content_prekey_signature,
          content_onetime_keys: onetime_content_prekeys,
          notif_prekey,
          notif_prekey_signature,
          notif_onetime_keys: onetime_notif_prekeys,
          device_type: Device::try_from(device_type)
            .map_err(handle_db_error)?,
        },
      };
      let session_id = generate_uuid();
      self
        .cache
        .insert(
          session_id.clone(),
          WorkflowInProgress::Login(Box::new(login_state)),
        )
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
            content_upload:
              Some(client_proto::PreKey {
                pre_key: content_prekey,
                pre_key_signature: content_prekey_signature,
              }),
            notif_upload:
              Some(client_proto::PreKey {
                pre_key: notif_prekey,
                pre_key_signature: notif_prekey_signature,
              }),
            onetime_content_prekeys,
            onetime_notif_prekeys,
            device_type,
          }),
      } = message
      {
        let key_info = KeyPayload::from_str(&payload)
          .map_err(|_| tonic::Status::invalid_argument("malformed payload"))?;
        (
          FlattenedDeviceKeyUpload {
            device_id_key: key_info.primary_identity_public_keys.ed25519,
            key_payload: payload,
            key_payload_signature: payload_signature,
            content_prekey,
            content_prekey_signature,
            content_onetime_keys: onetime_content_prekeys,
            notif_prekey,
            notif_prekey_signature,
            notif_onetime_keys: onetime_notif_prekeys,
            device_type: Device::try_from(device_type)
              .map_err(handle_db_error)?,
          },
          social_proof,
        )
      } else {
        return Err(tonic::Status::invalid_argument("unexpected message data"));
      };

    let user_id = match self
      .client
      .get_user_id_from_user_info(wallet_address.clone(), &AuthType::Wallet)
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

  async fn log_out_user(
    &self,
    request: tonic::Request<LogoutRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    let token_is_valid = self
      .client
      .verify_access_token(
        message.user_id.clone(),
        message.device_id_key.clone(),
        message.access_token,
      )
      .await
      .map_err(handle_db_error)?;

    if !token_is_valid {
      return Err(tonic::Status::permission_denied("bad token"));
    }

    self
      .client
      .remove_device_from_users_table(
        message.user_id.clone(),
        message.device_id_key.clone(),
      )
      .await
      .map_err(handle_db_error)?;

    self
      .client
      .delete_access_token_data(message.user_id, message.device_id_key)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};

    Ok(Response::new(response))
  }

  async fn delete_user(
    &self,
    request: tonic::Request<DeleteUserRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    let token_is_valid = self
      .client
      .verify_access_token(
        message.user_id.clone(),
        message.device_id_key,
        message.access_token,
      )
      .await
      .map_err(handle_db_error)?;

    if !token_is_valid {
      return Err(tonic::Status::permission_denied("bad token"));
    }

    self
      .client
      .delete_user(message.user_id)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};

    Ok(Response::new(response))
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

  async fn get_outbound_keys_for_user(
    &self,
    _request: tonic::Request<OutboundKeysForUserRequest>,
  ) -> Result<tonic::Response<OutboundKeysForUserResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn get_inbound_keys_for_user(
    &self,
    _request: tonic::Request<InboundKeysForUserRequest>,
  ) -> Result<tonic::Response<InboundKeysForUserResponse>, tonic::Status> {
    unimplemented!();
  }

  async fn upload_one_time_keys(
    &self,
    request: tonic::Request<UploadOneTimeKeysRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    debug!("Validating token: {:?}", message);
    let token_valid = self
      .client
      .verify_access_token(
        message.user_id.clone(),
        message.device_id.clone(),
        message.access_token,
      )
      .await
      .map_err(handle_db_error)?;

    if !token_valid {
      return Err(tonic::Status::unauthenticated("Invalid token"));
    }

    debug!(
      "Attempting to update one time keys for user: {}",
      message.user_id
    );
    self
      .client
      .append_one_time_prekeys(
        message.user_id,
        message.device_id,
        message.content_one_time_pre_keys,
        message.notif_one_time_pre_keys,
      )
      .await
      .map_err(handle_db_error)?;

    Ok(tonic::Response::new(Empty {}))
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
    let token_valid = self
      .client
      .verify_access_token(
        message.user_id,
        message.signing_public_key,
        message.access_token,
      )
      .await
      .map_err(handle_db_error)?;

    let response = Response::new(VerifyUserAccessTokenResponse { token_valid });
    Ok(response)
  }

  async fn add_reserved_usernames(
    &self,
    request: tonic::Request<AddReservedUsernamesRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    let usernames = validate_add_reserved_usernames_message(
      &message.message,
      &message.signature,
    )?;

    let filtered_usernames = self
      .client
      .filter_out_taken_usernames(usernames)
      .await
      .map_err(handle_db_error)?;

    self
      .client
      .add_usernames_to_reserved_usernames_table(filtered_usernames)
      .await
      .map_err(handle_db_error)?;

    let response = Response::new(Empty {});
    Ok(response)
  }

  async fn remove_reserved_username(
    &self,
    request: tonic::Request<RemoveReservedUsernameRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    let username = validate_remove_reserved_username_message(
      &message.message,
      &message.signature,
    )?;

    self
      .client
      .delete_username_from_reserved_usernames_table(username)
      .await
      .map_err(handle_db_error)?;

    let response = Response::new(Empty {});
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
