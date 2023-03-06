use opaque_ke::{
  errors::ProtocolError, ClientRegistration,
  ClientRegistrationFinishParameters, RegistrationResponse,
};
use rand::rngs::OsRng;

use crate::Cipher;

#[allow(dead_code)]
pub struct Registration {
  state: Option<ClientRegistration<Cipher>>,
  rng: OsRng,
  export_key: Option<Vec<u8>>,
}

impl Registration {
  #[allow(dead_code)]
  pub fn new() -> Registration {
    Registration {
      state: None,
      rng: OsRng,
      export_key: None,
    }
  }

  #[allow(dead_code)]
  pub fn start(&mut self, password: &str) -> Result<Vec<u8>, ProtocolError> {
    let result =
      ClientRegistration::<Cipher>::start(&mut self.rng, password.as_bytes())?;
    self.state = Some(result.state);
    Ok(result.message.serialize())
  }

  #[allow(dead_code)]
  pub fn finish(
    &mut self,
    response_payload: &[u8],
  ) -> Result<Vec<u8>, ProtocolError> {
    let response = RegistrationResponse::deserialize(response_payload)?;
    let state = self
      .state
      .take()
      .ok_or_else(|| ProtocolError::ClientError)?;
    let result = state.finish(
      &mut OsRng,
      response,
      ClientRegistrationFinishParameters::default(),
    )?;

    self.export_key = Some(result.export_key.to_vec());

    Ok(result.message.serialize().to_vec())
  }
}
