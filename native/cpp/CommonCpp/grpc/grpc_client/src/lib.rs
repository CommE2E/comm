use lazy_static::lazy_static;
use opaque_ke::{
  ClientLogin, ClientLoginFinishParameters, ClientLoginStartParameters,
  ClientRegistration, ClientRegistrationFinishParameters,
  CredentialFinalization, CredentialRequest, CredentialResponse,
  RegistrationResponse, RegistrationUpload,
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
  GetUserIdResponse, PakeLoginResponse as PakeLoginResponseStruct,
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

  #[instrument(skip(self))]
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
}

fn pake_registration_start(
  rng: &mut (impl Rng + CryptoRng),
  user_id: String,
  password: &str,
  device_id: String,
  username: String,
  user_public_key: String,
) -> Result<(RegistrationRequest, Option<ClientRegistration<Cipher>>), Status> {
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
    Some(client_registration_start_result.state),
  ))
}

fn pake_registration_finish(
  rng: &mut (impl Rng + CryptoRng),
  registration_response_bytes: &[u8],
  client_registration: Option<ClientRegistration<Cipher>>,
) -> Result<RegistrationUpload<Cipher>, Status> {
  client_registration
    .ok_or_else(|| {
      error!("PAKE client_registration not found");
      Status::aborted("Registration not found")
    })?
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
) -> Result<(CredentialRequest<Cipher>, Option<ClientLogin<Cipher>>), Status> {
  let client_login_start_result = ClientLogin::<Cipher>::start(
    rng,
    password.as_bytes(),
    ClientLoginStartParameters::default(),
  )
  .map_err(|e| {
    error!("Failed to start PAKE login: {}", e);
    Status::failed_precondition("PAKE failure")
  })?;
  Ok((
    client_login_start_result.message,
    Some(client_login_start_result.state),
  ))
}

fn pake_login_finish(
  credential_response_bytes: &[u8],
  client_login: Option<ClientLogin<Cipher>>,
) -> Result<CredentialFinalization<Cipher>, Status> {
  client_login
    .ok_or_else(|| {
      error!("PAKE client_login not found");
      Status::aborted("Login not found")
    })?
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
