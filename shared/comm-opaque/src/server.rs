use opaque_ke::{errors::ProtocolError, ServerRegistration};
use opaque_ke::{
  CredentialFinalization, CredentialRequest, RegistrationRequest,
  RegistrationUpload, ServerLogin, ServerLoginFinishResult,
  ServerLoginStartParameters,
};
use rand::rngs::OsRng;

use crate::config::CONFIG;
use crate::Cipher;

#[allow(dead_code)]
pub fn register_start(
  payload: &[u8],
) -> Result<(ServerRegistration<Cipher>, Vec<u8>), ProtocolError> {
  let upload = RegistrationRequest::deserialize(payload)?;
  let result = ServerRegistration::<Cipher>::start(
    &mut OsRng,
    upload,
    CONFIG.server_keypair.public(),
  )?;
  Ok((result.state, result.message.serialize()))
}

#[allow(dead_code)]
pub fn register_finish(
  server_registration: ServerRegistration<Cipher>,
  registration_upload_bytes: &[u8],
) -> Result<ServerRegistration<Cipher>, ProtocolError> {
  let upload_payload =
    RegistrationUpload::deserialize(registration_upload_bytes)?;
  server_registration.finish(upload_payload)
}

#[allow(dead_code)]
pub fn deserialize_registration(
  bytes: &[u8],
) -> Result<ServerRegistration<Cipher>, ProtocolError> {
  ServerRegistration::deserialize(bytes)
}

#[allow(dead_code)]
pub fn login_start(
  server_registration: ServerRegistration<Cipher>,
  pake_credential_request: &[u8],
) -> Result<(ServerLogin<Cipher>, Vec<u8>), ProtocolError> {
  let credential_request =
    CredentialRequest::deserialize(pake_credential_request)?;
  let result = ServerLogin::start(
    &mut OsRng,
    server_registration,
    CONFIG.server_keypair.private(),
    credential_request,
    ServerLoginStartParameters::default(),
  )?;
  Ok((result.state, result.message.serialize()?))
}

#[allow(dead_code)]
pub fn login_finish(
  server_login: ServerLogin<Cipher>,
  pake_credential_finalization: &[u8],
) -> Result<ServerLoginFinishResult<Cipher>, ProtocolError> {
  let finalization_payload =
    CredentialFinalization::deserialize(&pake_credential_finalization[..])?;
  server_login.finish(finalization_payload)
}
