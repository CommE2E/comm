use opaque_ke::{errors::ProtocolError, ServerRegistration};
use opaque_ke::{
  CredentialFinalization, CredentialRequest, ServerLogin,
  ServerLoginStartParameters, ServerSetup,
};
use rand::rngs::OsRng;

use crate::Cipher;

pub struct Login {
  state: Option<ServerLogin<Cipher>>,
  rng: OsRng,
  pub session_key: Option<Vec<u8>>,
  server_setup: ServerSetup<Cipher>,
}

impl Login {
  pub fn new(server_setup: ServerSetup<Cipher>) -> Login {
    Login {
      state: None,
      rng: OsRng,
      session_key: None,
      server_setup,
    }
  }

  pub fn start(
    &mut self,
    password_file_bytes: &[u8],
    credential_request: &[u8],
    credential_identifier: &[u8],
  ) -> Result<Vec<u8>, ProtocolError> {
    let password_file = ServerRegistration::deserialize(password_file_bytes)?;
    let credential_request =
      CredentialRequest::deserialize(credential_request)?;
    let result = ServerLogin::start(
      &mut OsRng,
      &self.server_setup,
      Some(password_file),
      credential_request,
      credential_identifier,
      ServerLoginStartParameters::default(),
    )?;
    self.state = Some(result.state);

    Ok(result.message.serialize().to_vec())
  }

  pub fn finish(
    &mut self,
    response_payload: &[u8],
  ) -> Result<(), ProtocolError> {
    let finalization_payload =
      CredentialFinalization::deserialize(&response_payload[..])?;

    let state = self
      .state
      .take()
      .ok_or_else(|| ProtocolError::InvalidLoginError)?;
    let result = state.finish(finalization_payload)?;
    self.session_key = Some(result.session_key.to_vec());
    Ok(())
  }
}
