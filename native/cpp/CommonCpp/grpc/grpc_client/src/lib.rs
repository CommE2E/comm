use lazy_static::lazy_static;
use opaque_ke::{
  ClientLogin, ClientLoginFinishParameters, ClientLoginStartParameters,
  ClientLoginStartResult, ClientRegistration,
  ClientRegistrationFinishParameters, CredentialFinalization,
  CredentialResponse, RegistrationResponse, RegistrationUpload,
};
use rand::{rngs::OsRng, CryptoRng, Rng};
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{transport::Channel, Request, Response, Status};
use tracing::{error, instrument};

use ::identity::Cipher;

use crate::identity::{
  get_user_id_request::AuthType,
  identity_service_client::IdentityServiceClient,
  pake_login_response::Data::AccessToken,
  pake_login_response::Data::PakeCredentialResponse,
  registration_request::Data::PakeCredentialFinalization,
  registration_request::Data::PakeRegistrationRequestAndUserId,
  registration_request::Data::PakeRegistrationUploadAndCredentialRequest,
  registration_response::Data::PakeLoginResponse,
  registration_response::Data::PakeRegistrationResponse, GetUserIdRequest,
  GetUserIdResponse, LoginRequest, LoginResponse,
  PakeLoginResponse as PakeLoginResponseStruct,
  PakeRegistrationRequestAndUserId as PakeRegistrationRequestAndUserIdStruct,
  PakeRegistrationUploadAndCredentialRequest as PakeRegistrationUploadAndCredentialRequestStruct,
  RegistrationRequest, RegistrationResponse as RegistrationResponseMessage,
  VerifyUserTokenRequest, VerifyUserTokenResponse,
};
pub mod identity {
  tonic::include_proto!("identity");
}

const IDENTITY_SERVICE_SOCKET_ADDR: &str = "https://[::1]:50051";

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

#[cxx::bridge(namespace = "identity")]
mod ffi {}

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

  #[instrument(skip(self))]
  fn get_user_id_blocking(
    &mut self,
    auth_type: AuthType,
    user_info: String,
  ) -> Result<Response<GetUserIdResponse>, Status> {
    RUNTIME.block_on(self.get_user_id(auth_type, user_info))
  }

  #[instrument(skip(self))]
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

  #[instrument(skip(self))]
  async fn register_user(
    &mut self,
    user_id: String,
    device_id: String,
    username: String,
    password: String,
    user_public_key: String,
  ) -> Result<String, Status> {
    // Create a RegistrationRequest channel and use ReceiverStream to turn the
    // MPSC receiver into a Stream for outbound messages
    let (tx, rx) = mpsc::channel(1);
    let stream = ReceiverStream::new(rx);
    let request = Request::new(stream);

    // `response` is the Stream for inbound messages
    let mut response = self
      .identity_client
      .register_user(request)
      .await?
      .into_inner();

    // Start PAKE registration on client and send initial registration request
    // to Identity service
    let mut client_rng = OsRng;
    let (registration_request, client_registration) = pake_registration_start(
      &mut client_rng,
      user_id,
      &password,
      device_id,
      username,
      user_public_key,
    )?;
    if let Err(e) = tx.send(registration_request).await {
      error!("Response was dropped: {}", e);
      return Err(Status::aborted("Dropped response"));
    }

    // Handle responses from Identity service sequentially, making sure we get
    // messages in the correct order

    // Finish PAKE registration and begin PAKE login; send the final
    // registration request and initial login request together to reduce the
    // number of trips
    let message = response.message().await?;
    let client_login = handle_registration_response(
      message,
      &mut client_rng,
      client_registration,
      &password,
      tx.clone(),
    )
    .await?;

    // Finish PAKE login; send final login request to Identity service
    let message = response.message().await?;
    handle_credential_response(message, client_login, tx).await?;

    // Return access token
    let message = response.message().await?;
    handle_token_response(message)
  }
}

fn pake_registration_start(
  rng: &mut (impl Rng + CryptoRng),
  user_id: String,
  password: &str,
  device_id: String,
  username: String,
  user_public_key: String,
) -> Result<(RegistrationRequest, ClientRegistration<Cipher>), Status> {
  let client_registration_start_result =
    ClientRegistration::<Cipher>::start(rng, password.as_bytes()).map_err(
      |e| {
        error!("Failed to start PAKE registration: {}", e);
        Status::failed_precondition("PAKE failure")
      },
    )?;
  let pake_registration_request =
    client_registration_start_result.message.serialize();
  Ok((
    RegistrationRequest {
      data: Some(PakeRegistrationRequestAndUserId(
        PakeRegistrationRequestAndUserIdStruct {
          user_id,
          device_id,
          pake_registration_request,
          username,
          user_public_key,
        },
      )),
    },
    client_registration_start_result.state,
  ))
}

fn pake_registration_finish(
  rng: &mut (impl Rng + CryptoRng),
  registration_response_bytes: &[u8],
  client_registration: ClientRegistration<Cipher>,
) -> Result<RegistrationUpload<Cipher>, Status> {
  client_registration
    .finish(
      rng,
      RegistrationResponse::deserialize(registration_response_bytes).map_err(
        |e| {
          error!("Could not deserialize registration response bytes: {}", e);
          Status::aborted("Invalid response bytes")
        },
      )?,
      ClientRegistrationFinishParameters::default(),
    )
    .map_err(|e| {
      error!("Failed to finish PAKE registration: {}", e);
      Status::aborted("PAKE failure")
    })
    .map(|res| res.message)
}

fn pake_login_start(
  rng: &mut (impl Rng + CryptoRng),
  password: &str,
) -> Result<ClientLoginStartResult<Cipher>, Status> {
  ClientLogin::<Cipher>::start(
    rng,
    password.as_bytes(),
    ClientLoginStartParameters::default(),
  )
  .map_err(|e| {
    error!("Failed to start PAKE login: {}", e);
    Status::failed_precondition("PAKE failure")
  })
}

fn pake_login_finish(
  credential_response_bytes: &[u8],
  client_login: ClientLogin<Cipher>,
) -> Result<CredentialFinalization<Cipher>, Status> {
  client_login
    .finish(
      CredentialResponse::deserialize(credential_response_bytes).map_err(
        |e| {
          error!("Could not deserialize credential response bytes: {}", e);
          Status::aborted("Invalid response bytes")
        },
      )?,
      ClientLoginFinishParameters::default(),
    )
    .map_err(|e| {
      error!("Failed to finish PAKE login: {}", e);
      Status::aborted("PAKE failure")
    })
    .map(|res| res.message)
}

fn handle_unexpected_registration_response(
  message: Option<RegistrationResponseMessage>,
) -> Status {
  error!("Received an unexpected message: {:?}", message);
  Status::invalid_argument("Invalid response data")
}

async fn handle_registration_response(
  message: Option<RegistrationResponseMessage>,
  client_rng: &mut (impl Rng + CryptoRng),
  client_registration: ClientRegistration<Cipher>,
  password: &str,
  tx: mpsc::Sender<RegistrationRequest>,
) -> Result<ClientLogin<Cipher>, Status> {
  if let Some(RegistrationResponseMessage {
    data: Some(PakeRegistrationResponse(registration_response_bytes)),
    ..
  }) = message
  {
    let pake_registration_upload = pake_registration_finish(
      client_rng,
      &registration_response_bytes,
      client_registration,
    )?
    .serialize();
    let client_login_start_result = pake_login_start(client_rng, password)?;

    // `registration_request` is a gRPC message containing serialized bytes to
    // complete PAKE registration and begin PAKE login
    let registration_request = RegistrationRequest {
      data: Some(PakeRegistrationUploadAndCredentialRequest(
        PakeRegistrationUploadAndCredentialRequestStruct {
          pake_registration_upload,
          pake_credential_request: client_login_start_result
            .message
            .serialize()
            .map_err(|e| {
              error!("Could not serialize credential request: {}", e);
              Status::failed_precondition("PAKE failure")
            })?,
        },
      )),
    };
    if let Err(e) = tx.send(registration_request).await {
      error!("Response was dropped: {}", e);
      return Err(Status::aborted("Dropped response"));
    }
    Ok(client_login_start_result.state)
  } else {
    Err(handle_unexpected_registration_response(message))
  }
}

async fn handle_credential_response(
  message: Option<RegistrationResponseMessage>,
  client_login: ClientLogin<Cipher>,
  tx: mpsc::Sender<RegistrationRequest>,
) -> Result<(), Status> {
  if let Some(RegistrationResponseMessage {
    data:
      Some(PakeLoginResponse(PakeLoginResponseStruct {
        data: Some(PakeCredentialResponse(credential_response_bytes)),
      })),
  }) = message
  {
    let registration_request = RegistrationRequest {
      data: Some(PakeCredentialFinalization(
        pake_login_finish(&credential_response_bytes, client_login)?
          .serialize()
          .map_err(|e| {
            error!("Could not serialize credential request: {}", e);
            Status::failed_precondition("PAKE failure")
          })?,
      )),
    };
    if let Err(e) = tx.send(registration_request).await {
      error!("Response was dropped: {}", e);
      return Err(Status::aborted("Dropped response"));
    }
    Ok(())
  } else {
    Err(handle_unexpected_registration_response(message))
  }
}

fn handle_token_response(
  message: Option<RegistrationResponseMessage>,
) -> Result<String, Status> {
  if let Some(RegistrationResponseMessage {
    data:
      Some(PakeLoginResponse(PakeLoginResponseStruct {
        data: Some(AccessToken(access_token)),
      })),
  }) = message
  {
    Ok(access_token)
  } else {
    Err(handle_unexpected_registration_response(message))
  }
}

struct RegistrationResponseAndSender {
  response: Option<RegistrationResponseMessage>,
  sender: mpsc::Sender<RegistrationRequest>,
}

struct LoginResponseAndSender {
  response: Option<LoginResponse>,
  sender: mpsc::Sender<LoginRequest>,
}

enum ResponseAndSender {
  Registration(RegistrationResponseAndSender),
  Login(LoginResponseAndSender),
}
