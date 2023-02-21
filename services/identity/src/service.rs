use aws_sdk_dynamodb::output::GetItemOutput;
use aws_sdk_dynamodb::Error as DynamoDBError;
use chrono::Utc;
use comm_opaque::Cipher;
use constant_time_eq::constant_time_eq;
use futures_core::Stream;
use opaque_ke::{
  CredentialFinalization, CredentialRequest,
  RegistrationRequest as PakeRegistrationRequest, ServerLogin,
  ServerLoginStartParameters,
};
use opaque_ke::{RegistrationUpload, ServerRegistration};
use rand::rngs::OsRng;
use rand::{CryptoRng, Rng};
use siwe::Message;
use std::pin::Pin;
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};
use tonic::{Request, Response, Status};
use tracing::{error, info, instrument};

use crate::constants::MPSC_CHANNEL_BUFFER_CAPACITY;
use crate::database::DatabaseClient;
use crate::token::{AccessTokenData, AuthType};
use crate::{config::Config, database::Error as DBError};

pub use proto::identity_service_server::IdentityServiceServer;
use proto::{
  get_user_id_request::AuthType as ProtoAuthType,
  identity_service_server::IdentityService,
  login_request::Data::PakeLoginRequest,
  login_request::Data::WalletLoginRequest,
  login_response::Data::PakeLoginResponse,
  login_response::Data::WalletLoginResponse,
  pake_login_request::Data::PakeCredentialFinalization,
  pake_login_request::Data::PakeCredentialRequestAndUserId,
  pake_login_response::Data::AccessToken,
  pake_login_response::Data::PakeCredentialResponse,
  registration_request::Data::PakeCredentialFinalization as PakeRegistrationCredentialFinalization,
  registration_request::Data::PakeRegistrationRequestAndUserId,
  registration_request::Data::PakeRegistrationUploadAndCredentialRequest,
  registration_response::Data::PakeLoginResponse as PakeRegistrationLoginResponse,
  registration_response::Data::PakeRegistrationResponse, DeleteUserRequest,
  DeleteUserResponse, GetUserIdRequest, GetUserIdResponse,
  GetUserPublicKeyRequest, GetUserPublicKeyResponse, LoginRequest,
  LoginResponse, PakeLoginRequest as PakeLoginRequestStruct,
  PakeLoginResponse as PakeLoginResponseStruct, RegistrationRequest,
  RegistrationResponse, VerifyUserTokenRequest, VerifyUserTokenResponse,
  WalletLoginRequest as WalletLoginRequestStruct,
  WalletLoginResponse as WalletLoginResponseStruct,
};

mod proto {
  tonic::include_proto!("identity");
}

mod login;
mod registration;

#[derive(Debug)]
enum PakeWorkflow {
  Registration,
  Login,
}

#[derive(derive_more::Constructor)]
pub struct MyIdentityService {
  config: Config,
  client: DatabaseClient,
}

#[tonic::async_trait]
impl IdentityService for MyIdentityService {
  type RegisterUserStream = Pin<
    Box<
      dyn Stream<Item = Result<RegistrationResponse, Status>> + Send + 'static,
    >,
  >;

  #[instrument(skip(self))]
  async fn register_user(
    &self,
    request: Request<tonic::Streaming<RegistrationRequest>>,
  ) -> Result<Response<Self::RegisterUserStream>, Status> {
    let mut in_stream = request.into_inner();
    let (tx, rx) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let first_message = in_stream.next().await;
    let mut registration_state = registration::handle_registration_request(
      first_message,
      self.client.clone(),
      tx.clone(),
      &self.config,
    )
    .await?;
    // ServerRegistration in opaque-ke v1.2 doesn't implement Clone, so we
    // have to take the value out of registration_state, replacing it with None
    let pake_state =
      if let Some(pake_state) = registration_state.pake_state.take() {
        pake_state
      } else {
        error!("registration_state is missing opaque-ke ServerRegistration");
        return Err(Status::failed_precondition("internal error"));
      };
    let second_message = in_stream.next().await;
    let server_login =
      registration::handle_registration_upload_and_credential_request(
        second_message,
        tx.clone(),
        self.client.clone(),
        &registration_state,
        pake_state,
        &self.config,
      )
      .await?;
    let third_message = in_stream.next().await;
    registration::handle_credential_finalization(
      third_message,
      tx,
      self.client.clone(),
      &registration_state,
      server_login,
    )
    .await?;

    let out_stream = ReceiverStream::new(rx);
    Ok(Response::new(
      Box::pin(out_stream) as Self::RegisterUserStream
    ))
  }

  type LoginUserStream =
    Pin<Box<dyn Stream<Item = Result<LoginResponse, Status>> + Send + 'static>>;

  #[instrument(skip(self))]
  async fn login_user(
    &self,
    request: Request<tonic::Streaming<LoginRequest>>,
  ) -> Result<Response<Self::LoginUserStream>, Status> {
    let mut in_stream = request.into_inner();
    let (tx, rx) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);

    let first_message = in_stream.next().await;
    let login_state = login::handle_login_request(
      first_message,
      tx.clone(),
      self.client.clone(),
      &self.config,
    )
    .await?;

    // login_state will be None if user is logging in with a wallet
    if let Some(state) = login_state {
      let second_message = in_stream.next().await;
      login::handle_credential_finalization(
        second_message,
        tx,
        self.client.clone(),
        state,
      )
      .await?;
    }

    let out_stream = ReceiverStream::new(rx);
    Ok(Response::new(Box::pin(out_stream) as Self::LoginUserStream))
  }

  #[instrument(skip(self))]
  async fn verify_user_token(
    &self,
    request: Request<VerifyUserTokenRequest>,
  ) -> Result<Response<VerifyUserTokenResponse>, Status> {
    info!("Received VerifyUserToken request: {:?}", request);
    let message = request.into_inner();
    let token_valid = match self
      .client
      .get_access_token_data(message.user_id, message.device_id)
      .await
    {
      Ok(Some(access_token_data)) => constant_time_eq(
        access_token_data.access_token.as_bytes(),
        message.access_token.as_bytes(),
      ),
      Ok(None) => false,
      Err(e) => return Err(handle_db_error(e)),
    };
    let response = Response::new(VerifyUserTokenResponse { token_valid });
    info!("Sending VerifyUserToken response: {:?}", response);
    Ok(response)
  }

  #[instrument(skip(self))]
  async fn get_user_id(
    &self,
    request: Request<GetUserIdRequest>,
  ) -> Result<Response<GetUserIdResponse>, Status> {
    let message = request.into_inner();
    let auth_type = match ProtoAuthType::from_i32(message.auth_type) {
      Some(ProtoAuthType::Password) => AuthType::Password,
      Some(ProtoAuthType::Wallet) => AuthType::Wallet,
      None => {
        error!(
          "Unable to parse AuthType from message: {}",
          message.auth_type
        );
        return Err(Status::invalid_argument("invalid message"));
      }
    };
    let user_id = match self
      .client
      .get_user_id_from_user_info(message.user_info, auth_type)
      .await
    {
      Ok(Some(user_id)) => user_id,
      Ok(None) => return Err(Status::not_found("no user ID found")),
      Err(e) => return Err(handle_db_error(e)),
    };
    let response = Response::new(GetUserIdResponse { user_id });
    Ok(response)
  }

  #[instrument(skip(self))]
  async fn get_user_public_key(
    &self,
    request: Request<GetUserPublicKeyRequest>,
  ) -> Result<Response<GetUserPublicKeyResponse>, Status> {
    let message = request.into_inner();
    let public_key = match self
      .client
      .get_user_public_key(message.user_id, message.device_id)
      .await
    {
      Ok(Some(public_key)) => public_key,
      Ok(None) => return Err(Status::not_found("no public key found")),
      Err(e) => return Err(handle_db_error(e)),
    };
    let response = Response::new(GetUserPublicKeyResponse { public_key });
    Ok(response)
  }

  #[instrument(skip(self))]
  async fn delete_user(
    &self,
    request: tonic::Request<DeleteUserRequest>,
  ) -> Result<tonic::Response<DeleteUserResponse>, tonic::Status> {
    let message = request.into_inner();
    match self.client.delete_user(message.user_id).await {
      Ok(_) => Ok(Response::new(DeleteUserResponse {})),
      Err(e) => Err(handle_db_error(e)),
    }
  }
}

async fn put_token_helper(
  client: DatabaseClient,
  auth_type: AuthType,
  user_id: &str,
  device_id: &str,
  rng: &mut (impl Rng + CryptoRng),
) -> Result<String, Status> {
  if user_id.is_empty() || device_id.is_empty() {
    error!(
      "Incomplete data: user ID \"{}\", device ID \"{}\"",
      user_id, device_id
    );
    return Err(Status::aborted("user not found"));
  }
  let access_token_data = AccessTokenData::new(
    user_id.to_string(),
    device_id.to_string(),
    auth_type,
    rng,
  );
  match client
    .put_access_token_data(access_token_data.clone())
    .await
  {
    Ok(_) => Ok(access_token_data.access_token),
    Err(e) => Err(handle_db_error(e)),
  }
}

fn parse_and_verify_siwe_message(
  user_id: &str,
  device_id: &str,
  siwe_message: &str,
  siwe_signature: Vec<u8>,
) -> Result<(), Status> {
  if user_id.is_empty() || device_id.is_empty() {
    error!(
      "Incomplete data: user ID {}, device ID {}",
      user_id, device_id
    );
    return Err(Status::aborted("user not found"));
  }
  let siwe_message: Message = match siwe_message.parse() {
    Ok(m) => m,
    Err(e) => {
      error!("Failed to parse SIWE message: {}", e);
      return Err(Status::invalid_argument("invalid message"));
    }
  };
  match siwe_message.verify(
    match siwe_signature.try_into() {
      Ok(s) => s,
      Err(e) => {
        error!("Conversion to SIWE signature failed: {:?}", e);
        return Err(Status::invalid_argument("invalid message"));
      }
    },
    None,
    None,
    Some(&Utc::now()),
  ) {
    Err(e) => {
      error!(
        "Signature verification failed for user {} on device {}: {}",
        user_id, device_id, e
      );
      Err(Status::unauthenticated("message not authenticated"))
    }
    Ok(_) => Ok(()),
  }
}

async fn wallet_login_helper(
  client: DatabaseClient,
  wallet_login_request: WalletLoginRequestStruct,
  rng: &mut (impl Rng + CryptoRng),
) -> Result<LoginResponse, Status> {
  parse_and_verify_siwe_message(
    &wallet_login_request.user_id,
    &wallet_login_request.device_id,
    &wallet_login_request.siwe_message,
    wallet_login_request.siwe_signature,
  )?;
  client
    .update_users_table(
      wallet_login_request.user_id.clone(),
      wallet_login_request.device_id.clone(),
      None,
      None,
      Some(wallet_login_request.user_public_key),
    )
    .await
    .map_err(handle_db_error)?;
  Ok(LoginResponse {
    data: Some(WalletLoginResponse(WalletLoginResponseStruct {
      access_token: put_token_helper(
        client,
        AuthType::Wallet,
        &wallet_login_request.user_id,
        &wallet_login_request.device_id,
        rng,
      )
      .await?,
    })),
  })
}

async fn pake_login_start(
  config: &Config,
  client: DatabaseClient,
  user_id: &str,
  pake_credential_request: &[u8],
) -> Result<LoginResponseAndPakeState, Status> {
  if user_id.is_empty() {
    error!("Incomplete data: user ID not provided");
    return Err(Status::aborted("user not found"));
  }
  let server_registration =
    match client.get_pake_registration(user_id.to_string()).await {
      Ok(Some(r)) => r,
      Ok(None) => {
        return Err(Status::not_found("user not found"));
      }
      Err(e) => return Err(handle_db_error(e)),
    };
  let credential_request =
    CredentialRequest::deserialize(pake_credential_request).map_err(|e| {
      error!("Failed to deserialize credential request: {}", e);
      Status::invalid_argument("invalid message")
    })?;
  match ServerLogin::start(
    &mut OsRng,
    server_registration,
    config.server_keypair.private(),
    credential_request,
    ServerLoginStartParameters::default(),
  ) {
    Ok(server_login_start_result) => Ok(LoginResponseAndPakeState {
      response: PakeLoginResponseStruct {
        data: Some(PakeCredentialResponse(
          server_login_start_result.message.serialize().map_err(|e| {
            error!("Failed to serialize PAKE message: {}", e);
            Status::failed_precondition("internal error")
          })?,
        )),
      },
      pake_state: server_login_start_result.state,
    }),
    Err(e) => {
      error!(
        "Encountered a PAKE protocol error when starting login: {}",
        e
      );
      Err(Status::aborted("server error"))
    }
  }
}

async fn pake_login_finish(
  user_id: &str,
  device_id: &str,
  user_public_key: &str,
  client: DatabaseClient,
  server_login: ServerLogin<Cipher>,
  pake_credential_finalization: &[u8],
  rng: &mut (impl Rng + CryptoRng),
  pake_workflow: PakeWorkflow,
) -> Result<PakeLoginResponseStruct, Status> {
  if user_id.is_empty() || device_id.is_empty() {
    error!(
      "Incomplete data: user ID {}, device ID {}",
      user_id, device_id
    );
    return Err(Status::aborted("user not found"));
  }
  server_login
    .finish(
      CredentialFinalization::deserialize(pake_credential_finalization)
        .map_err(|e| {
          error!("Failed to deserialize credential finalization bytes: {}", e);
          Status::aborted("login failed")
        })?,
    )
    .map_err(|e| {
      error!(
        "Encountered a PAKE protocol error when finishing login: {}",
        e
      );
      Status::aborted("server error")
    })?;
  if matches!(pake_workflow, PakeWorkflow::Login) {
    client
      .update_users_table(
        user_id.to_string(),
        device_id.to_string(),
        None,
        None,
        Some(user_public_key.to_string()),
      )
      .await
      .map_err(handle_db_error)?;
  }
  Ok(PakeLoginResponseStruct {
    data: Some(AccessToken(
      put_token_helper(client, AuthType::Password, user_id, device_id, rng)
        .await?,
    )),
  })
}

async fn pake_registration_start(
  config: &Config,
  rng: &mut (impl Rng + CryptoRng),
  registration_request_bytes: &[u8],
) -> Result<RegistrationResponseAndPakeState, Status> {
  match ServerRegistration::<Cipher>::start(
    rng,
    PakeRegistrationRequest::deserialize(registration_request_bytes).unwrap(),
    config.server_keypair.public(),
  ) {
    Ok(server_registration_start_result) => {
      Ok(RegistrationResponseAndPakeState {
        response: RegistrationResponse {
          data: Some(PakeRegistrationResponse(
            server_registration_start_result.message.serialize(),
          )),
        },
        pake_state: server_registration_start_result.state,
      })
    }
    Err(e) => {
      error!(
        "Encountered a PAKE protocol error when starting registration: {}",
        e
      );
      Err(Status::aborted("server error"))
    }
  }
}

async fn pake_registration_finish(
  user_id: &str,
  device_id: &str,
  client: DatabaseClient,
  registration_upload_bytes: &[u8],
  server_registration: Option<ServerRegistration<Cipher>>,
  username: &str,
  user_public_key: &str,
) -> Result<(), Status> {
  if user_id.is_empty() {
    error!("Incomplete data: user ID not provided");
    return Err(Status::aborted("user not found"));
  }
  let server_registration_finish_result = server_registration
    .ok_or_else(|| Status::aborted("registration failed"))?
    .finish(
      RegistrationUpload::deserialize(registration_upload_bytes).map_err(
        |e| {
          error!("Failed to deserialize registration upload bytes: {}", e);
          Status::aborted("registration failed")
        },
      )?,
    )
    .map_err(|e| {
      error!(
        "Encountered a PAKE protocol error when finishing registration: {}",
        e
      );
      Status::aborted("server error")
    })?;

  match client
    .add_user_to_users_table(
      user_id.to_string(),
      device_id.to_string(),
      server_registration_finish_result,
      username.to_string(),
      user_public_key.to_string(),
    )
    .await
  {
    Ok(_) => Ok(()),
    Err(e) => Err(handle_db_error(e)),
  }
}

fn handle_db_error(db_error: DBError) -> Status {
  match db_error {
    DBError::AwsSdk(DynamoDBError::InternalServerError(_))
    | DBError::AwsSdk(DynamoDBError::ProvisionedThroughputExceededException(
      _,
    ))
    | DBError::AwsSdk(DynamoDBError::RequestLimitExceeded(_)) => {
      Status::unavailable("please retry")
    }
    e => {
      error!("Encountered an unexpected error: {}", e);
      Status::failed_precondition("unexpected error")
    }
  }
}

struct RegistrationResponseAndPakeState {
  response: RegistrationResponse,
  pake_state: ServerRegistration<Cipher>,
}

struct LoginResponseAndPakeState {
  response: PakeLoginResponseStruct,
  pake_state: ServerLogin<Cipher>,
}
