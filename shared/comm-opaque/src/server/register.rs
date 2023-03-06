use opaque_ke::{errors::ProtocolError, ServerRegistration};
use opaque_ke::{RegistrationRequest, RegistrationUpload};
use rand::rngs::OsRng;

use crate::config::CONFIG;
use crate::Cipher;

#[allow(dead_code)]
pub struct Registration {
  state: Option<ServerRegistration<Cipher>>,
  rng: OsRng,
}

impl Registration {
  #[allow(dead_code)]
  pub fn new() -> Registration {
    Registration {
      state: None,
      rng: OsRng,
    }
  }

  #[allow(dead_code)]
  pub fn from_bytes(bytes: &[u8]) -> Result<Registration, ProtocolError> {
    Ok(Registration {
      state: Some(ServerRegistration::deserialize(bytes)?),
      rng: OsRng,
    })
  }

  #[allow(dead_code)]
  pub fn start(&mut self, payload: &[u8]) -> Result<Vec<u8>, ProtocolError> {
    let upload = RegistrationRequest::deserialize(payload)?;
    let result = ServerRegistration::<Cipher>::start(
      &mut self.rng,
      upload,
      CONFIG.server_keypair.public(),
    )?;
    self.state = Some(result.state);
    Ok(result.message.serialize())
  }

  #[allow(dead_code)]
  pub fn finish(
    &mut self,
    response_payload: &[u8],
  ) -> Result<Vec<u8>, ProtocolError> {
    let upload_payload = RegistrationUpload::deserialize(response_payload)?;
    let state = self
      .state
      .take()
      .ok_or_else(|| ProtocolError::ServerError)?;
    let result = state.finish(upload_payload)?;
    Ok(result.serialize())
  }
}
