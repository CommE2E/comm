// Standard library imports
use std::str::FromStr;

// External crate imports
use comm_lib::aws::DynamoDBError;
use comm_opaque2::grpc::protocol_error_to_grpc_status;
use moka::future::Cache;
use rand::rngs::OsRng;
use siwe::eip55;
use tonic::Response;
use tracing::{debug, error, warn};

// Workspace crate imports
use crate::config::CONFIG;
use crate::constants::request_metadata;
use crate::database::{
  DBDeviceTypeInt, DatabaseClient, DeviceType, KeyPayload,
};
use crate::error::Error as DBError;
use crate::grpc_services::protos::unauth::{
  find_user_id_request, AddReservedUsernamesRequest, AuthResponse, Empty,
  FindUserIdRequest, FindUserIdResponse, GenerateNonceResponse,
  OpaqueLoginFinishRequest, OpaqueLoginStartRequest, OpaqueLoginStartResponse,
  RegistrationFinishRequest, RegistrationStartRequest,
  RegistrationStartResponse, RemoveReservedUsernameRequest,
  ReservedRegistrationStartRequest, ReservedWalletLoginRequest,
  VerifyUserAccessTokenRequest, VerifyUserAccessTokenResponse,
  WalletLoginRequest,
};
use crate::grpc_services::shared::get_value;
use crate::grpc_utils::DeviceKeyUploadActions;
use crate::id::generate_uuid;
use crate::nonce::generate_nonce_data;
use crate::reserved_users::{
  validate_account_ownership_message_and_get_user_id,
  validate_add_reserved_usernames_message,
  validate_remove_reserved_username_message,
};
use crate::siwe::{
  is_valid_ethereum_address, parse_and_verify_siwe_message, SocialProof,
};
use crate::token::{AccessTokenData, AuthType};

pub use crate::grpc_services::protos::unauth::identity_client_service_server::{
    IdentityClientService, IdentityClientServiceServer,
  };

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
  pub user_id: Option<String>,
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
  pub content_one_time_keys: Vec<String>,
  pub notif_prekey: String,
  pub notif_prekey_signature: String,
  pub notif_one_time_keys: Vec<String>,
  pub device_type: DeviceType,
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

    self.check_username_taken(&message.username).await?;
    let username_in_reserved_usernames_table = self
      .client
      .username_in_reserved_usernames_table(&message.username)
      .await
      .map_err(handle_db_error)?;

    if username_in_reserved_usernames_table {
      return Err(tonic::Status::already_exists("username already exists"));
    }

    if CONFIG.reserved_usernames.contains(&message.username)
      || is_valid_ethereum_address(&message.username)
    {
      return Err(tonic::Status::invalid_argument("username reserved"));
    }

    let registration_state = construct_user_registration_info(
      &message,
      None,
      message.username.clone(),
    )?;
    let server_registration = comm_opaque2::server::Registration::new();
    let server_message = server_registration
      .start(
        &CONFIG.server_setup,
        &message.opaque_registration_request,
        message.username.as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;
    let session_id = self
      .cache
      .insert_with_uuid_key(WorkflowInProgress::Registration(Box::new(
        registration_state,
      )))
      .await;

    let response = RegistrationStartResponse {
      session_id,
      opaque_registration_response: server_message,
    };
    Ok(Response::new(response))
  }

  async fn register_reserved_password_user_start(
    &self,
    request: tonic::Request<ReservedRegistrationStartRequest>,
  ) -> Result<tonic::Response<RegistrationStartResponse>, tonic::Status> {
    let message = request.into_inner();
    self.check_username_taken(&message.username).await?;

    if CONFIG.reserved_usernames.contains(&message.username) {
      return Err(tonic::Status::invalid_argument("username reserved"));
    }

    let username_in_reserved_usernames_table = self
      .client
      .username_in_reserved_usernames_table(&message.username)
      .await
      .map_err(handle_db_error)?;
    if !username_in_reserved_usernames_table {
      return Err(tonic::Status::permission_denied("username not reserved"));
    }

    let user_id = validate_account_ownership_message_and_get_user_id(
      &message.username,
      &message.keyserver_message,
      &message.keyserver_signature,
    )?;

    let registration_state = construct_user_registration_info(
      &message,
      Some(user_id),
      message.username.clone(),
    )?;
    let server_registration = comm_opaque2::server::Registration::new();
    let server_message = server_registration
      .start(
        &CONFIG.server_setup,
        &message.opaque_registration_request,
        message.username.as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    let session_id = self
      .cache
      .insert_with_uuid_key(WorkflowInProgress::Registration(Box::new(
        registration_state,
      )))
      .await;

    let response = RegistrationStartResponse {
      session_id,
      opaque_registration_response: server_message,
    };
    Ok(Response::new(response))
  }

  async fn register_password_user_finish(
    &self,
    request: tonic::Request<RegistrationFinishRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let code_version = get_code_version(&request);
    let message = request.into_inner();

    if let Some(WorkflowInProgress::Registration(state)) =
      self.cache.get(&message.session_id)
    {
      self.cache.invalidate(&message.session_id).await;

      let server_registration = comm_opaque2::server::Registration::new();
      let password_file = server_registration
        .finish(&message.opaque_registration_upload)
        .map_err(protocol_error_to_grpc_status)?;

      let login_time = chrono::Utc::now();
      let device_id = state.flattened_device_key_upload.device_id_key.clone();
      let user_id = self
        .client
        .add_password_user_to_users_table(
          *state,
          password_file,
          code_version,
          login_time,
        )
        .await
        .map_err(handle_db_error)?;

      // Create access token
      let token = AccessTokenData::with_created_time(
        user_id.clone(),
        device_id,
        login_time,
        crate::token::AuthType::Password,
        &mut OsRng,
      );

      let access_token = token.access_token.clone();

      self
        .client
        .put_access_token_data(token)
        .await
        .map_err(handle_db_error)?;

      let response = AuthResponse {
        user_id,
        access_token,
      };
      Ok(Response::new(response))
    } else {
      Err(tonic::Status::not_found("session not found"))
    }
  }

  async fn log_in_password_user_start(
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

    let mut server_login = comm_opaque2::server::Login::new();
    let server_response = server_login
      .start(
        &CONFIG.server_setup,
        &password_file_bytes,
        &message.opaque_login_request,
        message.username.as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    let login_state =
      construct_user_login_info(&message, user_id, server_login)?;

    let session_id = self
      .cache
      .insert_with_uuid_key(WorkflowInProgress::Login(Box::new(login_state)))
      .await;

    let response = Response::new(OpaqueLoginStartResponse {
      session_id,
      opaque_login_response: server_response,
    });
    Ok(response)
  }

  async fn log_in_password_user_finish(
    &self,
    request: tonic::Request<OpaqueLoginFinishRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let code_version = get_code_version(&request);
    let message = request.into_inner();

    if let Some(WorkflowInProgress::Login(state)) =
      self.cache.get(&message.session_id)
    {
      self.cache.invalidate(&message.session_id).await;

      let mut server_login = state.opaque_server_login.clone();
      server_login
        .finish(&message.opaque_login_upload)
        .map_err(protocol_error_to_grpc_status)?;

      let login_time = chrono::Utc::now();
      self
        .client
        .add_user_device(
          state.user_id.clone(),
          state.flattened_device_key_upload.clone(),
          code_version,
          login_time,
        )
        .await
        .map_err(handle_db_error)?;

      // Create access token
      let token = AccessTokenData::with_created_time(
        state.user_id.clone(),
        state.flattened_device_key_upload.device_id_key,
        login_time,
        crate::token::AuthType::Password,
        &mut OsRng,
      );

      let access_token = token.access_token.clone();

      self
        .client
        .put_access_token_data(token)
        .await
        .map_err(handle_db_error)?;

      let response = AuthResponse {
        user_id: state.user_id,
        access_token,
      };
      Ok(Response::new(response))
    } else {
      Err(tonic::Status::not_found("session not found"))
    }
  }

  async fn log_in_wallet_user(
    &self,
    request: tonic::Request<WalletLoginRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let code_version = get_code_version(&request);
    let message = request.into_inner();

    let parsed_message = parse_and_verify_siwe_message(
      &message.siwe_message,
      &message.siwe_signature,
    )?;

    match self
      .client
      .get_nonce_from_nonces_table(&parsed_message.nonce)
      .await
      .map_err(handle_db_error)?
    {
      None => return Err(tonic::Status::invalid_argument("invalid nonce")),
      Some(nonce) if nonce.is_expired() => {
        // we don't need to remove the nonce from the table here
        // because the DynamoDB TTL will take care of it
        return Err(tonic::Status::aborted("nonce expired"));
      }
      Some(_) => self
        .client
        .remove_nonce_from_nonces_table(&parsed_message.nonce)
        .await
        .map_err(handle_db_error)?,
    };

    let wallet_address = eip55(&parsed_message.address);

    let flattened_device_key_upload =
      construct_flattened_device_key_upload(&message)?;

    let login_time = chrono::Utc::now();
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
          .add_user_device(
            id.clone(),
            flattened_device_key_upload.clone(),
            code_version,
            chrono::Utc::now(),
          )
          .await
          .map_err(handle_db_error)?;
        id
      }
      None => {
        // It's possible that the user attempting login is already registered
        // on Ashoat's keyserver. If they are, we should send back a gRPC status
        // code instructing them to get a signed message from Ashoat's keyserver
        // in order to claim their wallet address and register with the Identity
        // service.
        let username_in_reserved_usernames_table = self
          .client
          .username_in_reserved_usernames_table(&wallet_address)
          .await
          .map_err(handle_db_error)?;

        if username_in_reserved_usernames_table {
          return Err(tonic::Status::failed_precondition(
            "need keyserver message to claim username",
          ));
        }

        let social_proof =
          SocialProof::new(message.siwe_message, message.siwe_signature);
        let serialized_social_proof = serde_json::to_string(&social_proof)
          .map_err(|_| {
            tonic::Status::invalid_argument("invalid_social_proof")
          })?;

        // User doesn't exist yet and wallet address isn't reserved, so we
        // should add a new user in DDB
        self
          .client
          .add_wallet_user_to_users_table(
            flattened_device_key_upload.clone(),
            wallet_address,
            serialized_social_proof,
            None,
            code_version,
            login_time,
          )
          .await
          .map_err(handle_db_error)?
      }
    };

    // Create access token
    let token = AccessTokenData::with_created_time(
      user_id.clone(),
      flattened_device_key_upload.device_id_key,
      login_time,
      crate::token::AuthType::Password,
      &mut OsRng,
    );

    let access_token = token.access_token.clone();

    self
      .client
      .put_access_token_data(token)
      .await
      .map_err(handle_db_error)?;

    let response = AuthResponse {
      user_id,
      access_token,
    };
    Ok(Response::new(response))
  }

  async fn log_in_reserved_wallet_user(
    &self,
    request: tonic::Request<ReservedWalletLoginRequest>,
  ) -> Result<tonic::Response<AuthResponse>, tonic::Status> {
    let code_version = get_code_version(&request);
    let message = request.into_inner();

    let parsed_message = parse_and_verify_siwe_message(
      &message.siwe_message,
      &message.siwe_signature,
    )?;

    match self
      .client
      .get_nonce_from_nonces_table(&parsed_message.nonce)
      .await
      .map_err(handle_db_error)?
    {
      None => return Err(tonic::Status::invalid_argument("invalid nonce")),
      Some(_) => self
        .client
        .remove_nonce_from_nonces_table(&parsed_message.nonce)
        .await
        .map_err(handle_db_error)?,
    };

    let wallet_address = eip55(&parsed_message.address);

    self.check_wallet_address_taken(&wallet_address).await?;

    let wallet_address_in_reserved_usernames_table = self
      .client
      .username_in_reserved_usernames_table(&wallet_address)
      .await
      .map_err(handle_db_error)?;
    if !wallet_address_in_reserved_usernames_table {
      return Err(tonic::Status::permission_denied(
        "wallet address not reserved",
      ));
    }

    let user_id = validate_account_ownership_message_and_get_user_id(
      &wallet_address,
      &message.keyserver_message,
      &message.keyserver_signature,
    )?;

    let flattened_device_key_upload =
      construct_flattened_device_key_upload(&message)?;

    let social_proof =
      SocialProof::new(message.siwe_message, message.siwe_signature);
    let serialized_social_proof = serde_json::to_string(&social_proof)
      .map_err(|_| tonic::Status::invalid_argument("invalid_social_proof"))?;

    let login_time = chrono::Utc::now();
    self
      .client
      .add_wallet_user_to_users_table(
        flattened_device_key_upload.clone(),
        wallet_address,
        serialized_social_proof,
        Some(user_id.clone()),
        code_version,
        login_time,
      )
      .await
      .map_err(handle_db_error)?;

    let token = AccessTokenData::with_created_time(
      user_id.clone(),
      flattened_device_key_upload.device_id_key,
      login_time,
      crate::token::AuthType::Password,
      &mut OsRng,
    );

    let access_token = token.access_token.clone();

    self
      .client
      .put_access_token_data(token)
      .await
      .map_err(handle_db_error)?;

    let response = AuthResponse {
      user_id,
      access_token,
    };

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
      .await
      .map_err(handle_db_error)?;

    let response = Response::new(VerifyUserAccessTokenResponse { token_valid });
    debug!(
      "device {} was verified: {}",
      &message.device_id, token_valid
    );
    Ok(response)
  }

  async fn add_reserved_usernames(
    &self,
    request: tonic::Request<AddReservedUsernamesRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    let user_details = validate_add_reserved_usernames_message(
      &message.message,
      &message.signature,
    )?;

    let filtered_user_details = self
      .client
      .filter_out_taken_usernames(user_details)
      .await
      .map_err(handle_db_error)?;

    self
      .client
      .add_usernames_to_reserved_usernames_table(filtered_user_details)
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

  async fn ping(
    &self,
    _request: tonic::Request<Empty>,
  ) -> Result<Response<Empty>, tonic::Status> {
    let response = Response::new(Empty {});
    Ok(response)
  }

  async fn find_user_id(
    &self,
    request: tonic::Request<FindUserIdRequest>,
  ) -> Result<tonic::Response<FindUserIdResponse>, tonic::Status> {
    let message = request.into_inner();

    use find_user_id_request::Identifier;
    let (user_ident, auth_type) = match message.identifier {
      None => {
        return Err(tonic::Status::invalid_argument("no identifier provided"))
      }
      Some(Identifier::Username(username)) => (username, AuthType::Password),
      Some(Identifier::WalletAddress(address)) => (address, AuthType::Wallet),
    };

    let (is_reserved_result, user_id_result) = tokio::join!(
      self
        .client
        .username_in_reserved_usernames_table(&user_ident),
      self
        .client
        .get_user_id_from_user_info(user_ident.clone(), &auth_type),
    );
    let is_reserved = is_reserved_result.map_err(handle_db_error)?;
    let user_id = user_id_result.map_err(handle_db_error)?;

    Ok(Response::new(FindUserIdResponse {
      user_id,
      is_reserved,
    }))
  }
}

impl ClientService {
  async fn check_username_taken(
    &self,
    username: &str,
  ) -> Result<(), tonic::Status> {
    let username_taken = self
      .client
      .username_taken(username.to_string())
      .await
      .map_err(handle_db_error)?;
    if username_taken {
      return Err(tonic::Status::already_exists("username already exists"));
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
      .await
      .map_err(handle_db_error)?;
    if wallet_address_taken {
      return Err(tonic::Status::already_exists(
        "wallet address already exists",
      ));
    }
    Ok(())
  }
}

#[tonic::async_trait]
pub trait CacheExt<T> {
  async fn insert_with_uuid_key(&self, value: T) -> String;
}

#[tonic::async_trait]
impl<T> CacheExt<T> for Cache<String, T>
where
  T: Clone + Send + Sync + 'static,
{
  async fn insert_with_uuid_key(&self, value: T) -> String {
    let session_id = generate_uuid();
    self.insert(session_id.clone(), value).await;
    session_id
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

fn construct_user_registration_info(
  message: &impl DeviceKeyUploadActions,
  user_id: Option<String>,
  username: String,
) -> Result<UserRegistrationInfo, tonic::Status> {
  Ok(UserRegistrationInfo {
    username,
    flattened_device_key_upload: construct_flattened_device_key_upload(
      message,
    )?,
    user_id,
  })
}

fn construct_user_login_info(
  message: &impl DeviceKeyUploadActions,
  user_id: String,
  opaque_server_login: comm_opaque2::server::Login,
) -> Result<UserLoginInfo, tonic::Status> {
  Ok(UserLoginInfo {
    user_id,
    flattened_device_key_upload: construct_flattened_device_key_upload(
      message,
    )?,
    opaque_server_login,
  })
}

fn construct_flattened_device_key_upload(
  message: &impl DeviceKeyUploadActions,
) -> Result<FlattenedDeviceKeyUpload, tonic::Status> {
  let key_info = KeyPayload::from_str(&message.payload()?)
    .map_err(|_| tonic::Status::invalid_argument("malformed payload"))?;

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
    device_type: DeviceType::try_from(DBDeviceTypeInt(message.device_type()?))
      .map_err(handle_db_error)?,
  };

  Ok(flattened_device_key_upload)
}

fn get_code_version<T: std::fmt::Debug>(req: &tonic::Request<T>) -> u64 {
  get_value(req, request_metadata::CODE_VERSION)
    .and_then(|version| version.parse().ok())
    .unwrap_or_else(|| {
      warn!(
        "Could not retrieve code version from request: {:?}. Defaulting to 0",
        req
      );
      Default::default()
    })
}
