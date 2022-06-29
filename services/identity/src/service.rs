use chrono::Utc;
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
use rusoto_core::RusotoError;
use rusoto_dynamodb::{GetItemError, PutItemError};
use siwe::Message;
use std::pin::Pin;
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};
use tonic::{Request, Response, Status};
use tracing::{error, info, instrument};

use crate::constants::MPSC_CHANNEL_BUFFER_CAPACITY;
use crate::database::DatabaseClient;
use crate::opaque::Cipher;
use crate::token::{AccessTokenData, AuthType};
use crate::{config::Config, database::Error};

pub use proto::identity_service_server::IdentityServiceServer;
use proto::{
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
  registration_response::Data::PakeRegistrationResponse, LoginRequest,
  LoginResponse, PakeLoginRequest as PakeLoginRequestStruct,
  PakeLoginResponse as PakeLoginResponseStruct, RegistrationRequest,
  RegistrationResponse, VerifyUserTokenRequest, VerifyUserTokenResponse,
  WalletLoginRequest as WalletLoginRequestStruct,
  WalletLoginResponse as WalletLoginResponseStruct,
};

mod proto {
  tonic::include_proto!("identity");
}

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
    let config = self.config.clone();
    let client = self.client.clone();
    tokio::spawn(async move {
      let mut user_id: String = String::new();
      let mut device_id: String = String::new();
      let mut server_registration: Option<ServerRegistration<Cipher>> = None;
      let mut server_login: Option<ServerLogin<Cipher>> = None;
      let mut num_messages_received = 0;
      while let Some(message) = in_stream.next().await {
        match message {
          Ok(RegistrationRequest {
            data:
              Some(PakeRegistrationRequestAndUserId(
                pake_registration_request_and_user_id,
              )),
          }) => {
            let registration_start_result = pake_registration_start(
              config.clone(),
              &mut OsRng,
              &pake_registration_request_and_user_id.pake_registration_request,
              num_messages_received,
            )
            .await
            .map(|registration_response_and_server_registration| {
              server_registration =
                Some(registration_response_and_server_registration.1);
              registration_response_and_server_registration.0
            });
            if let Err(e) = tx.send(registration_start_result).await {
              error!("Response was dropped: {}", e);
              break;
            }
            user_id = pake_registration_request_and_user_id.user_id;
            device_id = pake_registration_request_and_user_id.device_id;
          }
          Ok(RegistrationRequest {
            data:
              Some(PakeRegistrationUploadAndCredentialRequest(
                pake_registration_upload_and_credential_request,
              )),
          }) => {
            let registration_finish_and_login_start_result =
              match pake_registration_finish(
                &user_id,
                client.clone(),
                &pake_registration_upload_and_credential_request
                  .pake_registration_upload,
                server_registration,
                num_messages_received,
              )
              .await
              {
                Ok(_) => pake_login_start(
                  config.clone(),
                  client.clone(),
                  &user_id.clone(),
                  &pake_registration_upload_and_credential_request
                    .pake_credential_request,
                  num_messages_received,
                  PakeWorkflow::Registration,
                )
                .await
                .map(|pake_login_response_and_server_login| {
                  server_login = Some(pake_login_response_and_server_login.1);
                  RegistrationResponse {
                    data: Some(PakeRegistrationLoginResponse(
                      pake_login_response_and_server_login.0,
                    )),
                  }
                }),
                Err(e) => Err(e),
              };
            if let Err(e) =
              tx.send(registration_finish_and_login_start_result).await
            {
              error!("Response was dropped: {}", e);
              break;
            }
            server_registration = None;
          }
          Ok(RegistrationRequest {
            data:
              Some(PakeRegistrationCredentialFinalization(
                pake_credential_finalization,
              )),
          }) => {
            let login_finish_result = pake_login_finish(
              &user_id,
              &device_id,
              client,
              server_login,
              &pake_credential_finalization,
              &mut OsRng,
              num_messages_received,
              PakeWorkflow::Registration,
            )
            .await
            .map(|pake_login_response| RegistrationResponse {
              data: Some(PakeRegistrationLoginResponse(pake_login_response)),
            });
            if let Err(e) = tx.send(login_finish_result).await {
              error!("Response was dropped: {}", e);
            }
            break;
          }
          unexpected => {
            error!("Received an unexpected Result: {:?}", unexpected);
            if let Err(e) = tx.send(Err(Status::unknown("unknown error"))).await
            {
              error!("Response was dropped: {}", e);
            }
            break;
          }
        }
        num_messages_received += 1;
      }
    });
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
    let config = self.config.clone();
    let client = self.client.clone();
    tokio::spawn(async move {
      let mut user_id: String = String::new();
      let mut device_id: String = String::new();
      let mut server_login: Option<ServerLogin<Cipher>> = None;
      let mut num_messages_received = 0;
      while let Some(message) = in_stream.next().await {
        match message {
          Ok(LoginRequest {
            data: Some(WalletLoginRequest(req)),
          }) => {
            let wallet_login_result = wallet_login_helper(
              client,
              req,
              &mut OsRng,
              num_messages_received,
            )
            .await;
            if let Err(e) = tx.send(wallet_login_result).await {
              error!("Response was dropped: {}", e);
            }
            break;
          }
          Ok(LoginRequest {
            data:
              Some(PakeLoginRequest(PakeLoginRequestStruct {
                data:
                  Some(PakeCredentialRequestAndUserId(
                    pake_credential_request_and_user_id,
                  )),
              })),
          }) => {
            let login_start_result = pake_login_start(
              config.clone(),
              client.clone(),
              &pake_credential_request_and_user_id.user_id,
              &pake_credential_request_and_user_id.pake_credential_request,
              num_messages_received,
              PakeWorkflow::Login,
            )
            .await
            .map(|pake_login_response_and_server_login| {
              server_login = Some(pake_login_response_and_server_login.1);
              LoginResponse {
                data: Some(PakeLoginResponse(
                  pake_login_response_and_server_login.0,
                )),
              }
            });
            if let Err(e) = tx.send(login_start_result).await {
              error!("Response was dropped: {}", e);
              break;
            }
            user_id = pake_credential_request_and_user_id.user_id;
            device_id = pake_credential_request_and_user_id.device_id;
          }
          Ok(LoginRequest {
            data:
              Some(PakeLoginRequest(PakeLoginRequestStruct {
                data:
                  Some(PakeCredentialFinalization(pake_credential_finalization)),
              })),
          }) => {
            let login_finish_result = pake_login_finish(
              &user_id,
              &device_id,
              client,
              server_login,
              &pake_credential_finalization,
              &mut OsRng,
              num_messages_received,
              PakeWorkflow::Login,
            )
            .await
            .map(|pake_login_response| LoginResponse {
              data: Some(PakeLoginResponse(pake_login_response)),
            });
            if let Err(e) = tx.send(login_finish_result).await {
              error!("Response was dropped: {}", e);
            }
            break;
          }
          unexpected => {
            error!("Received an unexpected Result: {:?}", unexpected);
            if let Err(e) = tx.send(Err(Status::unknown("unknown error"))).await
            {
              error!("Response was dropped: {}", e);
            }
            break;
          }
        }
        num_messages_received += 1;
      }
    });
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
      Err(Error::RusotoGet(RusotoError::Service(
        GetItemError::ResourceNotFound(_),
      )))
      | Err(Error::RusotoGet(RusotoError::Credentials(_))) => {
        return Err(Status::failed_precondition("internal error"))
      }
      Err(Error::RusotoGet(_)) => {
        return Err(Status::unavailable("please retry"))
      }
      Err(e) => {
        error!("Encountered an unexpected error: {}", e);
        return Err(Status::failed_precondition("unexpected error"));
      }
    };
    let response = Response::new(VerifyUserTokenResponse { token_valid });
    info!("Sending VerifyUserToken response: {:?}", response);
    Ok(response)
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
    auth_type.clone(),
    rng,
  );
  match client
    .put_access_token_data(access_token_data.clone())
    .await
  {
    Ok(_) => Ok(access_token_data.access_token),
    Err(Error::RusotoPut(RusotoError::Service(
      PutItemError::ResourceNotFound(_),
    )))
    | Err(Error::RusotoPut(RusotoError::Credentials(_))) => {
      Err(Status::failed_precondition("internal error"))
    }
    Err(Error::RusotoPut(_)) => Err(Status::unavailable("please retry")),
    Err(e) => {
      error!("Encountered an unexpected error: {}", e);
      Err(Status::failed_precondition("unexpected error"))
    }
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
  num_messages_received: u8,
) -> Result<LoginResponse, Status> {
  if num_messages_received != 0 {
    error!("Too many messages received in stream, aborting");
    return Err(Status::aborted("please retry"));
  }
  match parse_and_verify_siwe_message(
    &wallet_login_request.user_id,
    &wallet_login_request.device_id,
    &wallet_login_request.siwe_message,
    wallet_login_request.siwe_signature,
  ) {
    Ok(()) => Ok(LoginResponse {
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
    }),
    Err(e) => Err(e),
  }
}

async fn pake_login_start(
  config: Config,
  client: DatabaseClient,
  user_id: &str,
  pake_credential_request: &[u8],
  num_messages_received: u8,
  pake_workflow: PakeWorkflow,
) -> Result<(PakeLoginResponseStruct, ServerLogin<Cipher>), Status> {
  if (num_messages_received != 0
    && matches!(pake_workflow, PakeWorkflow::Login))
    || (num_messages_received != 1
      && matches!(pake_workflow, PakeWorkflow::Registration))
  {
    error!("Too many messages received in stream, aborting");
    return Err(Status::aborted("please retry"));
  }
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
      Err(e) => match e {
        Error::RusotoGet(RusotoError::Service(
          GetItemError::ResourceNotFound(_),
        ))
        | Error::RusotoGet(RusotoError::Credentials(_)) => {
          return Err(Status::failed_precondition("internal error"));
        }
        Error::RusotoGet(_) => {
          return Err(Status::unavailable("please retry"));
        }
        e => {
          error!("Encountered an unexpected error: {}", e);
          return Err(Status::failed_precondition("unexpected error"));
        }
      },
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
    Ok(server_login_start_result) => Ok((
      PakeLoginResponseStruct {
        data: Some(PakeCredentialResponse(
          server_login_start_result.message.serialize().map_err(|e| {
            error!("Failed to serialize PAKE message: {}", e);
            Status::failed_precondition("internal error")
          })?,
        )),
      },
      server_login_start_result.state,
    )),
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
  client: DatabaseClient,
  server_login: Option<ServerLogin<Cipher>>,
  pake_credential_finalization: &[u8],
  rng: &mut (impl Rng + CryptoRng),
  num_messages_received: u8,
  pake_workflow: PakeWorkflow,
) -> Result<PakeLoginResponseStruct, Status> {
  if (num_messages_received != 1
    && matches!(pake_workflow, PakeWorkflow::Login))
    || (num_messages_received != 2
      && matches!(pake_workflow, PakeWorkflow::Registration))
  {
    error!("Too many messages received in stream, aborting");
    return Err(Status::aborted("please retry"));
  }
  if user_id.is_empty() || device_id.is_empty() {
    error!(
      "Incomplete data: user ID {}, device ID {}",
      user_id, device_id
    );
    return Err(Status::aborted("user not found"));
  }
  match server_login
    .ok_or_else(|| {
      error!("Server login missing in {:?} PAKE workflow", pake_workflow);
      Status::aborted("login failed")
    })?
    .finish(
      CredentialFinalization::deserialize(pake_credential_finalization)
        .map_err(|e| {
          error!("Failed to deserialize credential finalization bytes: {}", e);
          Status::aborted("login failed")
        })?,
    ) {
    Ok(_) => Ok(PakeLoginResponseStruct {
      data: Some(AccessToken(
        put_token_helper(client, AuthType::Password, user_id, device_id, rng)
          .await?,
      )),
    }),
    Err(e) => {
      error!(
        "Encountered a PAKE protocol error when finishing login: {}",
        e
      );
      Err(Status::aborted("server error"))
    }
  }
}

async fn pake_registration_start(
  config: Config,
  rng: &mut (impl Rng + CryptoRng),
  registration_request_bytes: &[u8],
  num_messages_received: u8,
) -> Result<(RegistrationResponse, ServerRegistration<Cipher>), Status> {
  if num_messages_received != 0 {
    error!("Too many messages received in stream, aborting");
    return Err(Status::aborted("please retry"));
  }
  match ServerRegistration::<Cipher>::start(
    rng,
    PakeRegistrationRequest::deserialize(registration_request_bytes).unwrap(),
    config.server_keypair.public(),
  ) {
    Ok(server_registration_start_result) => Ok((
      RegistrationResponse {
        data: Some(PakeRegistrationResponse(
          server_registration_start_result.message.serialize(),
        )),
      },
      server_registration_start_result.state,
    )),
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
  client: DatabaseClient,
  registration_upload_bytes: &[u8],
  server_registration: Option<ServerRegistration<Cipher>>,
  num_messages_received: u8,
) -> Result<(), Status> {
  if num_messages_received != 1 {
    error!("Too many messages received in stream, aborting");
    return Err(Status::aborted("please retry"));
  }
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
    .put_pake_registration(
      user_id.to_string(),
      server_registration_finish_result,
    )
    .await
  {
    Ok(_) => Ok(()),
    Err(RusotoError::Service(PutItemError::ResourceNotFound(_)))
    | Err(RusotoError::Credentials(_)) => {
      Err(Status::failed_precondition("internal error"))
    }
    Err(_) => Err(Status::unavailable("please retry")),
  }
}
