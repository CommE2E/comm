use opaque_ke::{errors::ProtocolError, ServerRegistration};
use opaque_ke::{
  CredentialFinalization, CredentialRequest, ServerLogin,
  ServerLoginStartParameters,
};
use rand::rngs::OsRng;

use crate::config::CONFIG;
use crate::Cipher;

#[allow(dead_code)]
pub struct Login {
  state: Option<ServerLogin<Cipher>>,
  rng: OsRng,
  pub session_key: Option<Vec<u8>>,
}

impl Login {
  #[allow(dead_code)]
  pub fn new() -> Login {
    Login {
      state: None,
      rng: OsRng,
      session_key: None,
    }
  }

  #[allow(dead_code)]
  pub fn start(
    &mut self,
    password_file_bytes: &[u8],
    credential_request: &[u8],
  ) -> Result<Vec<u8>, ProtocolError> {
    let password_file = ServerRegistration::deserialize(password_file_bytes)?;
    let credential_request =
      CredentialRequest::deserialize(credential_request)?;
    let result = ServerLogin::start(
      &mut OsRng,
      password_file,
      CONFIG.server_keypair.private(),
      credential_request,
      ServerLoginStartParameters::default(),
    )?;
    self.state = Some(result.state);

    result.message.serialize()
  }

  #[allow(dead_code)]
  pub fn finish(
    &mut self,
    response_payload: &[u8],
  ) -> Result<(), ProtocolError> {
    let finalization_payload =
      CredentialFinalization::deserialize(&response_payload[..])?;

    let state = self
      .state
      .take()
      .ok_or_else(|| ProtocolError::ServerError)?;
    let result = state.finish(finalization_payload)?;
    self.session_key = Some(result.session_key);
    Ok(())
  }
}
