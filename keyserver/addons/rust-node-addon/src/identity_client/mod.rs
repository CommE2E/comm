pub mod compare_users;
pub mod delete_user;
pub mod login_user;
pub mod register_user;
pub mod identity {
  tonic::include_proto!("identity");
}
pub mod update_user;

use comm_opaque::Cipher;
use identity::identity_service_client::IdentityServiceClient;
use identity::{
  login_request::Data::PakeLoginRequest,
  login_request::Data::WalletLoginRequest,
  login_response::Data::PakeLoginResponse as LoginPakeLoginResponse,
  login_response::Data::WalletLoginResponse,
  pake_login_request::Data::PakeCredentialFinalization as LoginPakeCredentialFinalization,
  pake_login_request::Data::PakeCredentialRequestAndUserId,
  pake_login_response::Data::AccessToken,
  pake_login_response::Data::PakeCredentialResponse,
  registration_request::Data::PakeCredentialFinalization as RegistrationPakeCredentialFinalization,
  registration_request::Data::PakeRegistrationRequestAndUserId,
  registration_request::Data::PakeRegistrationUploadAndCredentialRequest,
  registration_response::Data::PakeLoginResponse as RegistrationPakeLoginResponse,
  registration_response::Data::PakeRegistrationResponse, CompareUsersRequest,
  DeleteUserRequest, LoginRequest, LoginResponse,
  PakeCredentialRequestAndUserId as PakeCredentialRequestAndUserIdStruct,
  PakeLoginRequest as PakeLoginRequestStruct,
  PakeLoginResponse as PakeLoginResponseStruct,
  PakeRegistrationRequestAndUserId as PakeRegistrationRequestAndUserIdStruct,
  PakeRegistrationUploadAndCredentialRequest as PakeRegistrationUploadAndCredentialRequestStruct,
  RegistrationRequest, RegistrationResponse as RegistrationResponseMessage,
  SessionInitializationInfo, WalletLoginRequest as WalletLoginRequestStruct,
  WalletLoginResponse as WalletLoginResponseStruct,
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
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env::var;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{metadata::MetadataValue, transport::Channel, Code, Request};
use tracing::{error, instrument};

lazy_static! {
  static ref IDENTITY_SERVICE_CONFIG: IdentityServiceConfig = {
    let config_json_string =
      var("COMM_JSONCONFIG_secrets_identity_service_config");
    match config_json_string {
      Ok(json) => serde_json::from_str(&json).unwrap(),
      Err(_) => IdentityServiceConfig::default(),
    }
  };
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdentityServiceConfig {
  identity_socket_addr: String,
  identity_auth_token: String,
}

impl Default for IdentityServiceConfig {
  fn default() -> Self {
    Self {
      identity_socket_addr: "https://[::1]:50051".to_string(),
      identity_auth_token: "test".to_string(),
    }
  }
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

async fn get_identity_service_channel() -> Result<Channel> {
  Channel::from_static(&IDENTITY_SERVICE_CONFIG.identity_socket_addr)
    .connect()
    .await
    .map_err(|_| {
      Error::new(
        Status::GenericFailure,
        "Unable to connect to identity service".to_string(),
      )
    })
}
