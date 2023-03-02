pub mod delete_user;
pub mod register_user;
pub mod identity {
  tonic::include_proto!("identity");
}
pub mod update_user;

use comm_opaque::Cipher;
use identity::identity_service_client::IdentityServiceClient;
use identity::{
  pake_login_response::Data::AccessToken,
  pake_login_response::Data::PakeCredentialResponse,
  registration_request::Data::PakeCredentialFinalization as RegistrationPakeCredentialFinalization,
  registration_request::Data::PakeRegistrationRequestAndUserId,
  registration_request::Data::PakeRegistrationUploadAndCredentialRequest,
  registration_response::Data::PakeLoginResponse as RegistrationPakeLoginResponse,
  registration_response::Data::PakeRegistrationResponse, DeleteUserRequest,
  PakeLoginResponse as PakeLoginResponseStruct,
  PakeRegistrationRequestAndUserId as PakeRegistrationRequestAndUserIdStruct,
  PakeRegistrationUploadAndCredentialRequest as PakeRegistrationUploadAndCredentialRequestStruct,
  RegistrationRequest, RegistrationResponse as RegistrationResponseMessage,
  SessionInitializationInfo,
};
use lazy_static::lazy_static;
use napi::bindgen_prelude::*;
use opaque_ke::{
  ClientLogin, ClientLoginFinishParameters, ClientLoginStartParameters,
  ClientLoginStartResult, ClientRegistration,
  ClientRegistrationFinishParameters, CredentialFinalization,
  CredentialResponse, RegistrationResponse, RegistrationUpload,
};
use rand::{rngs::OsRng, CryptoRng, Rng};
use std::collections::HashMap;
use std::env::var;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{metadata::MetadataValue, transport::Channel, Request};
use tracing::{error, instrument};

lazy_static! {
  pub static ref IDENTITY_SERVICE_SOCKET_ADDR: String =
    var("COMM_IDENTITY_SERVICE_SOCKET_ADDR")
      .unwrap_or_else(|_| "https://[::1]:50051".to_string());
  pub static ref AUTH_TOKEN: String = var("COMM_IDENTITY_SERVICE_AUTH_TOKEN")
    .unwrap_or_else(|_| "test".to_string());
}

fn handle_unexpected_response<T: std::fmt::Debug>(message: Option<T>) -> Error {
  error!("Received an unexpected message: {:?}", message);
  Error::from_status(Status::GenericFailure)
}

async fn send_to_mpsc<T>(tx: mpsc::Sender<T>, request: T) -> Result<()> {
  if let Err(e) = tx.send(request).await {
    error!("Response was dropped: {}", e);
    return Err(Error::from_status(Status::GenericFailure));
  }
  Ok(())
}

fn pake_login_start(
  rng: &mut (impl Rng + CryptoRng),
  password: &str,
) -> Result<ClientLoginStartResult<Cipher>> {
  ClientLogin::<Cipher>::start(
    rng,
    password.as_bytes(),
    ClientLoginStartParameters::default(),
  )
  .map_err(|e| {
    error!("Failed to start PAKE login: {}", e);
    Error::from_status(Status::GenericFailure)
  })
}

fn pake_login_finish(
  credential_response_bytes: &[u8],
  client_login: ClientLogin<Cipher>,
) -> Result<CredentialFinalization<Cipher>> {
  client_login
    .finish(
      CredentialResponse::deserialize(credential_response_bytes).map_err(
        |e| {
          error!("Could not deserialize credential response bytes: {}", e);
          Error::from_status(Status::GenericFailure)
        },
      )?,
      ClientLoginFinishParameters::default(),
    )
    .map_err(|e| {
      error!("Failed to finish PAKE login: {}", e);
      Error::from_status(Status::GenericFailure)
    })
    .map(|res| res.message)
}
