// Standard library imports
use std::str::FromStr;

// External crate imports
use comm_lib::shared::reserved_users::RESERVED_USERNAME_SET;
use comm_opaque2::grpc::protocol_error_to_grpc_status;
use grpc_clients::identity::PlatformMetadata;
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use siwe::eip55;
use tonic::Response;
use tracing::{debug, error, info, warn};

use crate::comm_service::tunnelbroker;
// Workspace crate imports
use crate::config::CONFIG;
use crate::constants::{error_types, tonic_status_messages};
use crate::database::{
  DBDeviceTypeInt, DatabaseClient, DeviceType, KeyPayload, UserInfoAndPasswordFile,
};
use crate::ddb_utils::{Identifier, is_transaction_conflict};
use crate::device_list::SignedDeviceList;
use crate::error::{DeviceListError, Error as DBError, consume_error};
use crate::grpc_services::authenticated::{DeletePasswordUserInfo, UpdatePasswordInfo, PrivilegedPasswordResetInfo};
use crate::grpc_services::protos::unauth::{
  find_user_id_request, AddReservedUsernamesRequest, AuthResponse, Empty,
  ExistingDeviceLoginRequest, FindUserIdRequest, FindUserIdResponse,
  GenerateNonceResponse, OpaqueLoginFinishRequest, OpaqueLoginStartRequest,
  OpaqueLoginStartResponse, RegistrationFinishRequest, RegistrationStartRequest,
  RegistrationStartResponse, RemoveReservedUsernameRequest,
  ReservedRegistrationStartRequest, RestoreUserRequest,
  SecondaryDeviceKeysUploadRequest, VerifyUserAccessTokenRequest,
  VerifyUserAccessTokenResponse, WalletAuthRequest, GetFarcasterUsersRequest,
  GetFarcasterUsersResponse
};
use crate::grpc_services::shared::get_platform_metadata;
use crate::grpc_utils::{
  DeviceKeyUploadActions, RegistrationActions, SignedNonce
};
use crate::log::redact_sensitive_data;
use crate::nonce::generate_nonce_data;
use crate::reserved_users::{
  validate_account_ownership_message_and_get_user_id,
  validate_add_reserved_usernames_message,
  validate_remove_reserved_username_message,
};
use crate::siwe::{
  parse_and_verify_siwe_message, SocialProof,
};
use comm_lib::{
  crypto,
};
use crate::token::{AccessTokenData, AuthType};
pub use crate::grpc_services::protos::unauth::identity_client_service_server::{
    IdentityClientService, IdentityClientServiceServer,
  };
use crate::regex::is_valid_username;

#[derive(Clone, Serialize, Deserialize)]
pub enum WorkflowInProgress {
  Registration(Box<UserRegistrationInfo>),
  Login(Box<UserLoginInfo>),
  Update(Box<UpdatePasswordInfo>),
  PasswordUserDeletion(Box<DeletePasswordUserInfo>),
  PrivilegedPasswordReset(Box<PrivilegedPasswordResetInfo>),
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UserRegistrationInfo {
  pub username: String,
  pub flattened_device_key_upload: FlattenedDeviceKeyUpload,
  pub user_id: Option<String>,
  pub farcaster_id: Option<String>,
  pub initial_device_list: Option<SignedDeviceList>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UserLoginInfo {
  pub user_id: String,
  pub username: String,
  pub flattened_device_key_upload: FlattenedDeviceKeyUpload,
  pub opaque_server_login: comm_opaque2::server::Login,
  pub device_to_remove: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FlattenedDeviceKeyUpload {
  pub device_id_key: String,
  pub key_payload: String,
  pub key_payload_signature: String,
  pub content_prekey: String,
  pub content_prekey_signature: String,
  pub content_one_time_keys: Vec<String>,
  pub notif_prekey: String,
  pub notif_prekey_signature: String,
  pub notif_one_time_keys: Vec<String>,
  pub device_type: DeviceType,
}

#[derive(derive_more::Constructor)]
pub struct ClientService {
  client: DatabaseClient,
}

#[tonic::async_trait]
impl IdentityClientService for ClientService {
  #[tracing::instrument(skip_all)]
  async fn register_password_user_start(
    &self,
    request: tonic::Request<RegistrationStartRequest>,
  ) -> Result<tonic::Response<RegistrationStartResponse>, tonic::Status> {
    let message = request.into_inner();
    debug!("Received registration request for: {}", message.username);

    if !is_valid_username(&message.username)
      || crypto::siwe::is_valid_ethereum_address(&message.username)
    {
      return Err(tonic::Status::invalid_argument(
        tonic_status_messages::INVALID_USERNAME,
      ));
    }

    self.check_username_taken(&message.username).await?;
    let username_in_reserved_usernames_table = self
      .client
      .get_user_id_from_reserved_usernames_table(&message.username)
      .await?
      .is_some();

    if username_in_reserved_usernames_table {
      return Err(tonic::Status::already_exists(
        tonic_status_messages::USERNAME_ALREADY_EXISTS,
      ));
    }

    if RESERVED_USERNAME_SET.contains(&message.username.to_lowercase()) {
      return Err(tonic::Status::invalid_argument(
        tonic_status_messages::USERNAME_RESERVED,
      ));
    }

    if let Some(fid) = &message.farcaster_id {
      self.check_farcaster_id_taken(fid).await?;
    }

    let registration_state = construct_user_registration_info(
      &message,
      None,
      message.username.clone(),
      message.farcaster_id.clone(),
    )?;
    self
      .check_device_id_taken(
        &registration_state.flattened_device_key_upload,
        None,
      )
      .await?;
    let server_registration = comm_opaque2::server::Registration::new();
    let server_message = server_registration
      .start(
        &CONFIG.server_setup,
        &message.opaque_registration_request,
        message.username.to_lowercase().as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;
    let session_id = self
      .client
      .insert_workflow(WorkflowInProgress::Registration(Box::new(
        registration_state,
      )))
      .await?;

    let response = RegistrationStartResponse {
      session_id,
      opaque_registration_response: server_message,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn register_reserved_password_user_start(
    &self,
    request: tonic::Request<ReservedRegistrationStartRequest>,
  ) -> Result<tonic::Response<RegistrationStartResponse>, tonic::Status> {
    let message = request.into_inner();
    self.check_username_taken(&message.username).await?;

    let Some(original_username) = self
      .client
      .get_original_username_from_reserved_usernames_table(&message.username)
      .await?
    else {
      return Err(tonic::Status::permission_denied(
        tonic_status_messages::USERNAME_NOT_RESERVED,
      ));
    };

    let user_id = validate_account_ownership_message_and_get_user_id(
      &message.username,
      &message.keyserver_message,
      &message.keyserver_signature,
    )?;

    let registration_state = construct_user_registration_info(
      &message,
      Some(user_id),
      original_username,
      None,
    )?;
    self
      .check_device_id_taken(
        &registration_state.flattened_device_key_upload,
        None,
      )
      .await?;
    let server_registration = comm_opaque2::server::Registration::new();
    let server_message = server_registration
      .start(
        &CONFIG.server_setup,
        &message.opaque_registration_request,
        message.username.to_lowercase().as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    let session_id = self
      .client
      .insert_workflow(WorkflowInProgress::Registration(Box::new(
        registration_state,
      )))
      .await?;

    let response = RegistrationStartResponse {
      session_id,
      opaque_registration_response: server_message,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn register_password_user_finish(
    &self,
    request: tonic::Request<RegistrationFinishRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let platform_metadata = get_platform_metadata(&request)?;
    let message = request.into_inner();

    if let Some(WorkflowInProgress::Registration(state)) =
      self.client.get_workflow(message.session_id).await?
    {
      let server_registration = comm_opaque2::server::Registration::new();
      let password_file = server_registration
        .finish(&message.opaque_registration_upload)
        .map_err(protocol_error_to_grpc_status)?;

      let login_time = chrono::Utc::now();
      let device_id = state.flattened_device_key_upload.device_id_key.clone();
      let username = state.username.clone();
      let user_id = self
        .client
        .add_password_user_to_users_table(
          *state,
          password_file,
          platform_metadata,
          login_time,
        )
        .await?;

      // Create access token
      let token = AccessTokenData::with_created_time(
        user_id.clone(),
        device_id,
        login_time,
        crate::token::AuthType::Password,
        &mut OsRng,
      );

      let access_token = token.access_token.clone();

      self.client.put_access_token_data(token).await?;

      let response = AuthResponse {
        user_id,
        access_token,
        username,
      };
      Ok(Response::new(response))
    } else {
      Err(tonic::Status::not_found(
        tonic_status_messages::SESSION_NOT_FOUND,
      ))
    }
  }

  #[tracing::instrument(skip_all)]
  async fn log_in_password_user_start(
    &self,
    request: tonic::Request<OpaqueLoginStartRequest>,
  ) -> Result<tonic::Response<OpaqueLoginStartResponse>, tonic::Status> {
    let message = request.into_inner();

    debug!("Attempting to log in user: {:?}", &message.username);
    let user_id_and_password_file = self
      .client
      .get_user_info_and_password_file_from_username(&message.username)
      .await?;

    let UserInfoAndPasswordFile {
      user_id,
      original_username: username,
      password_file: password_file_bytes,
    } = if let Some(data) = user_id_and_password_file {
      data
    } else {
      // It's possible that the user attempting login is already registered
      // on Ashoat's keyserver. If they are, we should send back a gRPC status
      // code instructing them to get a signed message from Ashoat's keyserver
      // in order to claim their username and register with the Identity
      // service.
      let username_in_reserved_usernames_table = self
        .client
        .get_user_id_from_reserved_usernames_table(&message.username)
        .await?
        .is_some();

      if username_in_reserved_usernames_table {
        return Err(tonic::Status::permission_denied(
          tonic_status_messages::NEED_KEYSERVER_MESSAGE_TO_CLAIM_USERNAME,
        ));
      }

      return Err(tonic::Status::not_found(
        tonic_status_messages::USER_NOT_FOUND,
      ));
    };

    if self
      .client
      .get_user_login_flow(&user_id)
      .await?
      .is_new_flows()
    {
      return Err(tonic::Status::failed_precondition(
        tonic_status_messages::USE_NEW_FLOW,
      ));
    }

    let flattened_device_key_upload =
      construct_flattened_device_key_upload(&message)?;
    self
      .check_device_id_taken(&flattened_device_key_upload, Some(&user_id))
      .await?;

    let maybe_device_to_remove = self
      .get_keyserver_device_to_remove(
        &user_id,
        &flattened_device_key_upload.device_id_key,
        message.force.unwrap_or(false),
        &flattened_device_key_upload.device_type,
      )
      .await?;

    let mut server_login = comm_opaque2::server::Login::new();
    let server_response = match server_login.start(
      &CONFIG.server_setup,
      &password_file_bytes,
      &message.opaque_login_request,
      message.username.to_lowercase().as_bytes(),
    ) {
      Ok(response) => response,
      Err(_) => {
        // Retry with original username bytes if the first attempt fails
        server_login
          .start(
            &CONFIG.server_setup,
            &password_file_bytes,
            &message.opaque_login_request,
            username.as_bytes(),
          )
          .map_err(protocol_error_to_grpc_status)?
      }
    };

    let login_state = construct_user_login_info(
      user_id,
      username,
      server_login,
      flattened_device_key_upload,
      maybe_device_to_remove,
    )?;

    let session_id = self
      .client
      .insert_workflow(WorkflowInProgress::Login(Box::new(login_state)))
      .await?;

    let response = Response::new(OpaqueLoginStartResponse {
      session_id,
      opaque_login_response: server_response,
    });
    Ok(response)
  }

  #[tracing::instrument(skip_all)]
  async fn log_in_password_user_finish(
    &self,
    request: tonic::Request<OpaqueLoginFinishRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let platform_metadata = get_platform_metadata(&request)?;
    let message = request.into_inner();

    let Some(WorkflowInProgress::Login(state)) =
      self.client.get_workflow(message.session_id).await?
    else {
      return Err(tonic::Status::not_found(
        tonic_status_messages::SESSION_NOT_FOUND,
      ));
    };

    let mut server_login = state.opaque_server_login;
    server_login
      .finish(&message.opaque_login_upload)
      .map_err(protocol_error_to_grpc_status)?;

    if let Some(device_to_remove) = state.device_to_remove {
      self
        .client
        .remove_device(state.user_id.clone(), device_to_remove)
        .await?;
    }

    let login_time = chrono::Utc::now();
    self
      .client
      .add_user_device(
        state.user_id.clone(),
        state.flattened_device_key_upload.clone(),
        platform_metadata,
        login_time,
      )
      .await?;

    // Create access token
    let token = AccessTokenData::with_created_time(
      state.user_id.clone(),
      state.flattened_device_key_upload.device_id_key,
      login_time,
      crate::token::AuthType::Password,
      &mut OsRng,
    );

    let access_token = token.access_token.clone();

    self.client.put_access_token_data(token).await?;

    let response = AuthResponse {
      user_id: state.user_id,
      access_token,
      username: state.username,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn log_in_wallet_user(
    &self,
    request: tonic::Request<WalletAuthRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let platform_metadata = get_platform_metadata(&request)?;
    let message = request.into_inner();

    // WalletAuthRequest is used for both log_in_wallet_user and register_wallet_user
    if !message.initial_device_list.is_empty() {
      return Err(tonic::Status::invalid_argument(
        tonic_status_messages::UNEXPECTED_INITIAL_DEVICE_LIST,
      ));
    }

    let parsed_message = parse_and_verify_siwe_message(
      &message.siwe_message,
      &message.siwe_signature,
    )
    .await?;

    self.verify_and_remove_nonce(&parsed_message.nonce).await?;

    let wallet_address = eip55(&parsed_message.address);

    let flattened_device_key_upload =
      construct_flattened_device_key_upload(&message)?;

    let login_time = chrono::Utc::now();

    let user_id = if let Some(user_id) = self
      .client
      .get_user_id_from_user_info(wallet_address.clone(), &AuthType::Wallet)
      .await?
    {
      if self
        .client
        .get_user_login_flow(&user_id)
        .await?
        .is_new_flows()
      {
        return Err(tonic::Status::failed_precondition(
          tonic_status_messages::USE_NEW_FLOW,
        ));
      }

      self
        .check_device_id_taken(&flattened_device_key_upload, Some(&user_id))
        .await?;

      self
        .client
        .add_user_device(
          user_id.clone(),
          flattened_device_key_upload.clone(),
          platform_metadata,
          login_time,
        )
        .await?;

      user_id
    } else {
      let Some(user_id) = self
        .client
        .get_user_id_from_reserved_usernames_table(&wallet_address)
        .await?
      else {
        return Err(tonic::Status::not_found(
          tonic_status_messages::USER_NOT_FOUND,
        ));
      };

      if self
        .client
        .get_user_login_flow(&user_id)
        .await?
        .is_new_flows()
      {
        return Err(tonic::Status::failed_precondition(
          tonic_status_messages::USE_NEW_FLOW,
        ));
      }

      // It's possible that the user attempting login is already registered
      // on Ashoat's keyserver. If they are, we should try to register them if
      // they're on a mobile device, otherwise we should send back a gRPC status
      // code instructing them to try logging in from a mobile device first.
      if platform_metadata.device_type.to_uppercase() != "ANDROID"
        && platform_metadata.device_type.to_uppercase() != "IOS"
      {
        return Err(tonic::Status::permission_denied(
          tonic_status_messages::RETRY_FROM_NATIVE,
        ));
      };

      let social_proof =
        SocialProof::new(message.siwe_message, message.siwe_signature);

      self
        .check_device_id_taken(&flattened_device_key_upload, Some(&user_id))
        .await?;

      self
        .client
        .add_wallet_user_to_users_table(
          flattened_device_key_upload.clone(),
          wallet_address.clone(),
          social_proof,
          Some(user_id.clone()),
          platform_metadata,
          login_time,
          message.farcaster_id,
          None,
        )
        .await?;

      user_id
    };

    // Create access token
    let token = AccessTokenData::with_created_time(
      user_id.clone(),
      flattened_device_key_upload.device_id_key,
      login_time,
      crate::token::AuthType::Wallet,
      &mut OsRng,
    );

    let access_token = token.access_token.clone();

    self.client.put_access_token_data(token).await?;

    let response = AuthResponse {
      user_id,
      access_token,
      username: wallet_address,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn register_wallet_user(
    &self,
    request: tonic::Request<WalletAuthRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let platform_metadata = get_platform_metadata(&request)?;
    let message = request.into_inner();

    let parsed_message = parse_and_verify_siwe_message(
      &message.siwe_message,
      &message.siwe_signature,
    )
    .await?;

    self.verify_and_remove_nonce(&parsed_message.nonce).await?;

    let wallet_address = eip55(&parsed_message.address);

    self.check_wallet_address_taken(&wallet_address).await?;
    let username_in_reserved_usernames_table = self
      .client
      .get_user_id_from_reserved_usernames_table(&wallet_address)
      .await?
      .is_some();

    if username_in_reserved_usernames_table {
      return Err(tonic::Status::already_exists(
        tonic_status_messages::WALLET_ADDRESS_TAKEN,
      ));
    }

    if let Some(fid) = &message.farcaster_id {
      self.check_farcaster_id_taken(fid).await?;
    }

    let flattened_device_key_upload =
      construct_flattened_device_key_upload(&message)?;
    self
      .check_device_id_taken(&flattened_device_key_upload, None)
      .await?;

    let login_time = chrono::Utc::now();

    let initial_device_list = message.get_and_verify_initial_device_list()?;
    let social_proof =
      SocialProof::new(message.siwe_message, message.siwe_signature);

    let user_id = self
      .client
      .add_wallet_user_to_users_table(
        flattened_device_key_upload.clone(),
        wallet_address.clone(),
        social_proof,
        None,
        platform_metadata,
        login_time,
        message.farcaster_id,
        initial_device_list,
      )
      .await?;

    // Create access token
    let token = AccessTokenData::with_created_time(
      user_id.clone(),
      flattened_device_key_upload.device_id_key,
      login_time,
      crate::token::AuthType::Wallet,
      &mut OsRng,
    );

    let access_token = token.access_token.clone();

    self.client.put_access_token_data(token).await?;

    let response = AuthResponse {
      user_id,
      access_token,
      username: wallet_address,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn restore_user(
    &self,
    request: tonic::Request<RestoreUserRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let platform_metadata = get_platform_metadata(&request)?;
    let message = request.into_inner();
    debug!(
      "Attempting to restore user: {}",
      redact_sensitive_data(&message.user_id)
    );

    if self
      .client
      .get_user_login_flow(&message.user_id)
      .await?
      .is_v1_flows()
    {
      return Err(tonic::Status::failed_precondition(
        tonic_status_messages::USE_V1_FLOW,
      ));
    }

    let user_identifier = self
      .client
      .get_user_identity(&message.user_id)
      .await?
      .ok_or_else(|| {
        tonic::Status::not_found(tonic_status_messages::USER_NOT_FOUND)
      })?
      .identifier;

    if matches!(user_identifier, Identifier::Username(_))
      && (message.siwe_message.is_some() || message.siwe_signature.is_some())
    {
      debug!("SIWE data present for password user!");
      return Err(tonic::Status::invalid_argument(
        tonic_status_messages::PASSWORD_USER,
      ));
    }

    if let Identifier::WalletAddress(ref eth_identity) = &user_identifier {
      let (Some(siwe_message), Some(siwe_signature)) =
        (&message.siwe_message, &message.siwe_signature)
      else {
        debug!("SIWE data absent for wallet user!");
        return Err(tonic::Status::invalid_argument(
          tonic_status_messages::WALLET_USER,
        ));
      };
      let parsed_message =
        parse_and_verify_siwe_message(siwe_message, siwe_signature).await?;
      self.verify_and_remove_nonce(&parsed_message.nonce).await?;

      let wallet_address = eip55(&parsed_message.address);
      if wallet_address != eth_identity.wallet_address {
        debug!(
          "Wallet address mismatch: expected '{}' but got '{}' instead",
          &eth_identity.wallet_address, &wallet_address
        );
        return Err(tonic::Status::invalid_argument(
          tonic_status_messages::WALLET_ADDRESS_MISMATCH,
        ));
      }

      debug!("Updating social proof...");
      let social_proof =
        SocialProof::new(siwe_message.to_string(), siwe_signature.to_string());
      self
        .client
        .update_wallet_user_social_proof(&message.user_id, social_proof)
        .await?;
    }

    let flattened_device_key_upload =
      construct_flattened_device_key_upload(&message)?;
    let access_token = self
      .restore_primary_device_and_get_csat(
        message.user_id.clone(),
        message.device_list,
        platform_metadata,
        flattened_device_key_upload,
      )
      .await?;

    let response = AuthResponse {
      user_id: message.user_id,
      access_token,
      username: user_identifier.username().to_string(),
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn upload_keys_for_registered_device_and_log_in(
    &self,
    request: tonic::Request<SecondaryDeviceKeysUploadRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let platform_metadata = get_platform_metadata(&request)?;
    let message = request.into_inner();

    let challenge_response = SignedNonce::try_from(&message)?;
    let flattened_device_key_upload =
      construct_flattened_device_key_upload(&message)?;

    let user_id = message.user_id;
    let device_id = flattened_device_key_upload.device_id_key.clone();

    if self
      .client
      .get_user_login_flow(&user_id)
      .await?
      .is_v1_flows()
    {
      return Err(tonic::Status::failed_precondition(
        tonic_status_messages::USE_V1_FLOW,
      ));
    }

    let nonce = challenge_response.verify_and_get_nonce(&device_id)?;
    self.verify_and_remove_nonce(&nonce).await?;

    self
      .check_device_id_taken(&flattened_device_key_upload, Some(&user_id))
      .await?;

    let user_identity = self
      .client
      .get_user_identity(&user_id)
      .await?
      .ok_or_else(|| {
        tonic::Status::not_found(tonic_status_messages::USER_NOT_FOUND)
      })?;

    let Some(device_list) =
      self.client.get_current_device_list(&user_id).await?
    else {
      warn!("User {} does not have valid device list. Secondary device auth impossible.", redact_sensitive_data(&user_id));
      return Err(tonic::Status::aborted(
        tonic_status_messages::DEVICE_LIST_ERROR,
      ));
    };

    if !device_list.device_ids.contains(&device_id) {
      return Err(tonic::Status::permission_denied(
        tonic_status_messages::DEVICE_NOT_IN_DEVICE_LIST,
      ));
    }

    let login_time = chrono::Utc::now();
    let identifier = user_identity.identifier;
    let username = identifier.username().to_string();
    let token = AccessTokenData::with_created_time(
      user_id.clone(),
      device_id,
      login_time,
      identifier.into(),
      &mut OsRng,
    );
    let access_token = token.access_token.clone();
    self.client.put_access_token_data(token).await?;

    self
      .client
      .put_device_data(
        &user_id,
        flattened_device_key_upload,
        platform_metadata,
        login_time,
      )
      .await?;

    let response = AuthResponse {
      user_id,
      access_token,
      username,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn log_in_existing_device(
    &self,
    request: tonic::Request<ExistingDeviceLoginRequest>,
  ) -> std::result::Result<tonic::Response<AuthResponse>, tonic::Status> {
    let message = request.into_inner();
    let challenge_response = SignedNonce::try_from(&message)?;
    let ExistingDeviceLoginRequest {
      user_id, device_id, ..
    } = message;

    let nonce = challenge_response.verify_and_get_nonce(&device_id)?;
    self.verify_and_remove_nonce(&nonce).await?;

    let (identity_response, device_list_response) = tokio::join!(
      self.client.get_user_identity(&user_id),
      self.client.get_current_device_list(&user_id)
    );
    let user_identity = identity_response?.ok_or_else(|| {
      tonic::Status::not_found(tonic_status_messages::USER_NOT_FOUND)
    })?;

    let device_list = device_list_response?.ok_or_else(|| {
      warn!(
        "User {} does not have a valid device list.",
        redact_sensitive_data(&user_id)
      );
      tonic::Status::aborted(tonic_status_messages::DEVICE_LIST_ERROR)
    })?;

    if !device_list.device_ids.contains(&device_id) {
      return Err(tonic::Status::permission_denied(
        tonic_status_messages::DEVICE_NOT_IN_DEVICE_LIST,
      ));
    }

    let login_time = chrono::Utc::now();
    let identifier = user_identity.identifier;
    let username = identifier.username().to_string();
    let token = AccessTokenData::with_created_time(
      user_id.clone(),
      device_id,
      login_time,
      identifier.into(),
      &mut OsRng,
    );
    let access_token = token.access_token.clone();
    self.client.put_access_token_data(token).await?;

    let response = AuthResponse {
      user_id,
      access_token,
      username,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn generate_nonce(
    &self,
    _request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<GenerateNonceResponse>, tonic::Status> {
    let nonce_data = generate_nonce_data(&mut OsRng);
    self
      .client
      .add_nonce_to_nonces_table(nonce_data.clone())
      .await?;

    let response = GenerateNonceResponse {
      nonce: nonce_data.nonce,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn verify_user_access_token(
    &self,
    request: tonic::Request<VerifyUserAccessTokenRequest>,
  ) -> Result<tonic::Response<VerifyUserAccessTokenResponse>, tonic::Status> {
    let message = request.into_inner();
    debug!("Verifying device: {}", &message.device_id);

    let token_valid = self
      .client
      .verify_access_token(
        message.user_id,
        message.device_id.clone(),
        message.access_token,
      )
      .await?;

    let response = Response::new(VerifyUserAccessTokenResponse { token_valid });
    debug!(
      "device {} was verified: {}",
      &message.device_id, token_valid
    );
    Ok(response)
  }

  #[tracing::instrument(skip_all)]
  async fn add_reserved_usernames(
    &self,
    request: tonic::Request<AddReservedUsernamesRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    let user_details = validate_add_reserved_usernames_message(
      &message.message,
      &message.signature,
    )?;

    let filtered_user_details =
      self.client.filter_out_taken_usernames(user_details).await?;

    self
      .client
      .add_usernames_to_reserved_usernames_table(filtered_user_details)
      .await?;

    let response = Response::new(Empty {});
    Ok(response)
  }

  #[tracing::instrument(skip_all)]
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
      .await?;

    let response = Response::new(Empty {});
    Ok(response)
  }

  #[tracing::instrument(skip_all)]
  async fn ping(
    &self,
    _request: tonic::Request<Empty>,
  ) -> Result<Response<Empty>, tonic::Status> {
    let response = Response::new(Empty {});
    Ok(response)
  }

  #[tracing::instrument(skip_all)]
  async fn find_user_id(
    &self,
    request: tonic::Request<FindUserIdRequest>,
  ) -> Result<tonic::Response<FindUserIdResponse>, tonic::Status> {
    let message = request.into_inner();

    use find_user_id_request::Identifier;
    let (user_ident, auth_type) = match message.identifier {
      None => {
        return Err(tonic::Status::invalid_argument(
          tonic_status_messages::NO_IDENTIFIER_PROVIDED,
        ))
      }
      Some(Identifier::Username(username)) => (username, AuthType::Password),
      Some(Identifier::WalletAddress(address)) => (address, AuthType::Wallet),
    };

    let (get_user_id_from_reserved_usernames_table_result, user_id_result) = tokio::join!(
      self
        .client
        .get_user_id_from_reserved_usernames_table(&user_ident),
      self
        .client
        .get_user_id_from_user_info(user_ident.clone(), &auth_type),
    );
    let is_reserved =
      get_user_id_from_reserved_usernames_table_result?.is_some();
    let user_id = user_id_result?;

    Ok(Response::new(FindUserIdResponse {
      user_id,
      is_reserved,
    }))
  }

  #[tracing::instrument(skip_all)]
  async fn get_farcaster_users(
    &self,
    request: tonic::Request<GetFarcasterUsersRequest>,
  ) -> Result<tonic::Response<GetFarcasterUsersResponse>, tonic::Status> {
    let message = request.into_inner();

    let farcaster_users = self
      .client
      .get_farcaster_users(message.farcaster_ids)
      .await?
      .into_iter()
      .map(|d| d.0)
      .collect();

    Ok(Response::new(GetFarcasterUsersResponse { farcaster_users }))
  }
}

impl ClientService {
  async fn check_username_taken(
    &self,
    username: &str,
  ) -> Result<(), tonic::Status> {
    let username_taken =
      self.client.username_taken(username.to_string()).await?;
    if username_taken {
      return Err(tonic::Status::already_exists(
        tonic_status_messages::USERNAME_ALREADY_EXISTS,
      ));
    }
    Ok(())
  }

  async fn check_wallet_address_taken(
    &self,
    wallet_address: &str,
  ) -> Result<(), tonic::Status> {
    let wallet_address_taken = self
      .client
      .wallet_address_taken(wallet_address.to_string())
      .await?;
    if wallet_address_taken {
      return Err(tonic::Status::already_exists(
        tonic_status_messages::WALLET_ADDRESS_TAKEN,
      ));
    }
    Ok(())
  }

  async fn check_farcaster_id_taken(
    &self,
    farcaster_id: &str,
  ) -> Result<(), tonic::Status> {
    let fid_already_registered = !self
      .client
      .get_farcaster_users(vec![farcaster_id.to_string()])
      .await?
      .is_empty();
    if fid_already_registered {
      return Err(tonic::Status::already_exists(
        tonic_status_messages::FID_TAKEN,
      ));
    }
    Ok(())
  }

  async fn check_device_id_taken(
    &self,
    key_upload: &FlattenedDeviceKeyUpload,
    requesting_user_id: Option<&str>,
  ) -> Result<(), tonic::Status> {
    let device_id = key_upload.device_id_key.as_str();
    let Some(existing_device_user_id) =
      self.client.find_user_id_for_device(device_id).await?
    else {
      // device ID doesn't exist
      return Ok(());
    };

    // allow already-existing device ID for the same user
    match requesting_user_id {
      Some(user_id) if user_id == existing_device_user_id => {
        debug!(
          "Found already-existing device {} for user {}",
          device_id, user_id
        );
        Ok(())
      }
      _ => {
        warn!("Device ID already exists: {device_id}");
        Err(tonic::Status::already_exists(
          tonic_status_messages::DEVICE_ID_ALREADY_EXISTS,
        ))
      }
    }
  }

  async fn verify_and_remove_nonce(
    &self,
    nonce: &str,
  ) -> Result<(), tonic::Status> {
    match self.client.get_nonce_from_nonces_table(nonce).await? {
      None => {
        return Err(tonic::Status::invalid_argument(
          tonic_status_messages::INVALID_NONCE,
        ))
      }
      Some(nonce) if nonce.is_expired() => {
        // we don't need to remove the nonce from the table here
        // because the DynamoDB TTL will take care of it
        return Err(tonic::Status::aborted(
          tonic_status_messages::NONCE_EXPIRED,
        ));
      }
      Some(nonce_data) => {
        self
          .client
          .remove_nonce_from_nonces_table(&nonce_data.nonce)
          .await?
      }
    };
    Ok(())
  }

  async fn get_keyserver_device_to_remove(
    &self,
    user_id: &str,
    new_keyserver_device_id: &str,
    force: bool,
    device_type: &DeviceType,
  ) -> Result<Option<String>, tonic::Status> {
    if device_type != &DeviceType::Keyserver {
      return Ok(None);
    }

    let maybe_keyserver_device_id = self
      .client
      .get_keyserver_device_id_for_user(user_id)
      .await?;

    let Some(existing_keyserver_device_id) = maybe_keyserver_device_id else {
      return Ok(None);
    };

    if new_keyserver_device_id == existing_keyserver_device_id {
      return Ok(None);
    }

    if force {
      info!(
        "keyserver {} will be removed from the device list",
        existing_keyserver_device_id
      );
      Ok(Some(existing_keyserver_device_id))
    } else {
      Err(tonic::Status::already_exists(
        tonic_status_messages::USER_ALREADY_HAS_KEYSERVER,
      ))
    }
  }

  /// This function is used in Backup Restore protocol. It:
  /// - Verifies singleton device list with both old and new primary signature
  /// - Performs device list update (updates with singleton payload)
  /// - Removes all CSATs, OTKs, Devices data for all devices
  /// - Closes Tunnelbroker connections with these devices
  /// - Registers the new primary device (Device Key Upload)
  /// - Issues a new CSAT for the new primary device and returns it
  async fn restore_primary_device_and_get_csat(
    &self,
    user_id: String,
    device_list_payload: String,
    platform_metadata: PlatformMetadata,
    device_key_upload: FlattenedDeviceKeyUpload,
  ) -> Result<String, tonic::Status> {
    debug!("Verifying device list...");
    let new_primary_device_id = device_key_upload.device_id_key.clone();
    let previous_primary_device_id = self
      .client
      .get_current_device_list(&user_id)
      .await?
      .and_then(|device_list| device_list.primary_device_id().cloned())
      .ok_or_else(|| {
        error!(
          user_id = redact_sensitive_data(&user_id),
          errorType = error_types::GRPC_SERVICES_LOG,
          "User had missing or empty device list (before backup restore)!"
        );
        tonic::Status::failed_precondition(
          tonic_status_messages::NO_DEVICE_LIST,
        )
      })?;

    // Verify device list payload
    let signed_list: SignedDeviceList = device_list_payload.parse()?;
    let device_list_payload =
      crate::database::DeviceListUpdate::try_from(signed_list)?;
    crate::device_list::verify_singleton_device_list(
      &device_list_payload,
      &new_primary_device_id,
      Some(&previous_primary_device_id),
    )?;

    debug!(user_id, "Attempting to revoke user's old access tokens");
    self.client.delete_all_tokens_for_user(&user_id).await?;
    // We must delete the one-time keys first because doing so requires device
    // IDs from the devices table
    debug!(user_id, "Attempting to delete user's old one-time keys");
    self
      .client
      .delete_otks_table_rows_for_user(&user_id)
      .await?;
    debug!(user_id, "Attempting to delete user's old devices");
    let old_device_ids =
      self.client.delete_devices_data_for_user(&user_id).await?;

    spawn_force_close_tb_session_task(old_device_ids);

    // Reset device list (perform update)
    let login_time = chrono::Utc::now();
    debug!(user_id, "Registering new primary device...");
    self
      .client
      .register_primary_device(
        &user_id,
        device_key_upload,
        platform_metadata,
        login_time,
        device_list_payload,
      )
      .await?;

    // Create new access token
    let token_data = AccessTokenData::with_created_time(
      user_id.clone(),
      new_primary_device_id,
      login_time,
      crate::token::AuthType::Password,
      &mut OsRng,
    );

    let access_token = token_data.access_token.clone();
    self.client.put_access_token_data(token_data).await?;

    Ok(access_token)
  }
}

#[tracing::instrument(skip_all)]
pub fn handle_db_error(db_error: DBError) -> tonic::Status {
  use comm_lib::aws::DynamoDBError as DDBError;
  use tonic::Status;
  use tonic_status_messages as msg;
  use DBError as E;

  match db_error {
    E::AwsSdk(DDBError::InternalServerError(_))
    | E::AwsSdk(DDBError::ProvisionedThroughputExceededException(_))
    | E::AwsSdk(DDBError::RequestLimitExceeded(_)) => {
      Status::unavailable(msg::RETRY)
    }
    E::AwsSdk(ref err) if is_transaction_conflict(err) => {
      warn!("DB operation conflicted. Returning RETRY status.");
      Status::unavailable(msg::RETRY)
    }
    E::DeviceList(DeviceListError::InvalidDeviceListUpdate) => {
      Status::invalid_argument(msg::INVALID_DEVICE_LIST_UPDATE)
    }
    E::DeviceList(DeviceListError::InvalidSignature) => {
      Status::invalid_argument(msg::INVALID_DEVICE_LIST_SIGNATURE)
    }
    e => {
      error!(
        errorType = error_types::GENERIC_DB_LOG,
        "Encountered an unexpected error: {}", e
      );
      Status::failed_precondition(msg::UNEXPECTED_ERROR)
    }
  }
}

impl From<DBError> for tonic::Status {
  fn from(err: DBError) -> Self {
    handle_db_error(err)
  }
}

fn construct_user_registration_info(
  message: &(impl DeviceKeyUploadActions + RegistrationActions),
  user_id: Option<String>,
  username: String,
  farcaster_id: Option<String>,
) -> Result<UserRegistrationInfo, tonic::Status> {
  Ok(UserRegistrationInfo {
    username,
    flattened_device_key_upload: construct_flattened_device_key_upload(
      message,
    )?,
    user_id,
    farcaster_id,
    initial_device_list: message.get_and_verify_initial_device_list()?,
  })
}

fn construct_user_login_info(
  user_id: String,
  username: String,
  opaque_server_login: comm_opaque2::server::Login,
  flattened_device_key_upload: FlattenedDeviceKeyUpload,
  device_to_remove: Option<String>,
) -> Result<UserLoginInfo, tonic::Status> {
  Ok(UserLoginInfo {
    user_id,
    username,
    flattened_device_key_upload,
    opaque_server_login,
    device_to_remove,
  })
}

fn construct_flattened_device_key_upload(
  message: &impl DeviceKeyUploadActions,
) -> Result<FlattenedDeviceKeyUpload, tonic::Status> {
  let key_info = KeyPayload::from_str(&message.payload()?).map_err(|_| {
    tonic::Status::invalid_argument(tonic_status_messages::MALFORMED_PAYLOAD)
  })?;

  let flattened_device_key_upload = FlattenedDeviceKeyUpload {
    device_id_key: key_info.primary_identity_public_keys.ed25519,
    key_payload: message.payload()?,
    key_payload_signature: message.payload_signature()?,
    content_prekey: message.content_prekey()?,
    content_prekey_signature: message.content_prekey_signature()?,
    content_one_time_keys: message.one_time_content_prekeys()?,
    notif_prekey: message.notif_prekey()?,
    notif_prekey_signature: message.notif_prekey_signature()?,
    notif_one_time_keys: message.one_time_notif_prekeys()?,
    device_type: DeviceType::try_from(DBDeviceTypeInt(message.device_type()?))?,
  };

  Ok(flattened_device_key_upload)
}

fn spawn_force_close_tb_session_task(device_ids: Vec<String>) {
  tokio::spawn(async move {
    debug!(
      "Attempting to terminate Tunnelbroker sessions for devices: {:?}",
      device_ids.as_slice()
    );
    let result = tunnelbroker::terminate_device_sessions(&device_ids).await;
    consume_error(result);
  });
}
