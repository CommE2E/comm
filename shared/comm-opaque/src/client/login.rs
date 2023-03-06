use opaque_ke::{
  errors::ProtocolError, ClientLogin, ClientLoginFinishParameters,
  ClientLoginStartParameters, CredentialResponse,
};
use rand::rngs::OsRng;

use crate::Cipher;

#[allow(dead_code)]
pub struct Login {
  state: Option<ClientLogin<Cipher>>,
  rng: OsRng,
  export_key: Option<Vec<u8>>,
  pub session_key: Option<Vec<u8>>,
}

impl Login {
  #[allow(dead_code)]
  pub fn new() -> Login {
    Login {
      state: None,
      rng: OsRng,
      session_key: None,
      export_key: None,
    }
  }

  #[allow(dead_code)]
  pub fn start(&mut self, password: &str) -> Result<Vec<u8>, ProtocolError> {
    let client_start_result = ClientLogin::<Cipher>::start(
      &mut self.rng,
      password.as_bytes(),
      ClientLoginStartParameters::default(),
    )?;
    self.state = Some(client_start_result.state);
    client_start_result.message.serialize()
  }

  #[allow(dead_code)]
  pub fn finish(
    &mut self,
    response_payload: &[u8],
  ) -> Result<Vec<u8>, ProtocolError> {
    let response = CredentialResponse::deserialize(response_payload)?;
    let state = self
      .state
      .take()
      .ok_or_else(|| ProtocolError::ClientError)?;
    let result =
      state.finish(response, ClientLoginFinishParameters::default())?;

    self.session_key = Some(result.session_key.to_vec());
    self.export_key = Some(result.export_key.to_vec());

    Ok(result.message.serialize()?.to_vec())
  }
}
