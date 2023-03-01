use comm_opaque::Cipher;
use opaque_ke::CredentialFinalization;
use opaque_ke::CredentialRequest;
use opaque_ke::RegistrationRequest;
use opaque_ke::RegistrationUpload;
use opaque_ke::ServerLogin;
use opaque_ke::ServerLoginFinishResult;
use opaque_ke::ServerLoginStartParameters;
use opaque_ke::ServerLoginStartResult;
use opaque_ke::ServerRegistration;
use opaque_ke::ServerRegistrationStartResult;
use rand::CryptoRng;
use rand::Rng;
use tonic::Status;
use tracing::error;

use crate::config::CONFIG;

/// This file is meant to expose the opaque_ke actions, but
/// returning tonic::Status as the error type to reduce boilerplate
/// around describing PAKE failures to grpc.

pub fn server_registration_start(
  rng: &mut (impl Rng + CryptoRng),
  pake_registration_request: &Vec<u8>,
) -> Result<ServerRegistrationStartResult<Cipher>, Status> {
  let registration_bytes = RegistrationRequest::deserialize(
    &pake_registration_request[..],
  )
  .map_err(|e| {
    error!("Unsuccessfully deserialized registration bytes: {}", e);
    Status::invalid_argument("Invalid Registration response")
  })?;
  ServerRegistration::<Cipher>::start(
    rng,
    registration_bytes,
    CONFIG.server_keypair.public(),
  )
  .map_err(|e| {
    error!("Unsuccessfully started PAKE server response: {}", e);
    Status::aborted("server error")
  })
}

pub fn server_registration_finish(
  server_registration: ServerRegistration<Cipher>,
  registration_upload_bytes: &Vec<u8>,
) -> Result<ServerRegistration<Cipher>, Status> {
  let upload_payload = RegistrationUpload::deserialize(
    registration_upload_bytes,
  )
  .map_err(|e| {
    error!("Failed to deserialize registration upload bytes: {}", e);
    Status::invalid_argument("invalid registration")
  })?;
  server_registration.finish(upload_payload).map_err(|e| {
    error!(
      "Encountered a PAKE protocol error when finishing registration: {}",
      e
    );
    Status::aborted("server error")
  })
}

pub fn server_login_start(
  rng: &mut (impl Rng + CryptoRng),
  server_registration: ServerRegistration<Cipher>,
  pake_credential_request: &[u8],
) -> Result<ServerLoginStartResult<Cipher>, Status> {
  let credential_request =
    CredentialRequest::deserialize(pake_credential_request).map_err(|e| {
      error!("Failed to deserialize credential request: {}", e);
      Status::invalid_argument("invalid message")
    })?;
  ServerLogin::start(
    rng,
    server_registration,
    CONFIG.server_keypair.private(),
    credential_request,
    ServerLoginStartParameters::default(),
  )
  .map_err(|e| {
    error!(
      "Encountered a PAKE protocol error when starting login: {}",
      e
    );
    Status::aborted("server error")
  })
}
pub fn server_login_finish(
  server_login: ServerLogin<Cipher>,
  pake_credential_finalization: &Vec<u8>,
) -> Result<ServerLoginFinishResult<Cipher>, Status> {
  let finalization_payload =
    CredentialFinalization::deserialize(&pake_credential_finalization[..])
      .map_err(|e| {
        error!("Failed to deserialize credential finalization bytes: {}", e);
        Status::invalid_argument("Could not deserialize login credentials")
      })?;
  server_login.finish(finalization_payload).map_err(|e| {
    error!(
      "Encountered a PAKE protocol error when finishing login: {}",
      e
    );
    Status::aborted("server error")
  })
}
