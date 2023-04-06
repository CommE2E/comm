use opaque_ke::{errors::ProtocolError, ServerRegistration};
use opaque_ke::{RegistrationRequest, RegistrationUpload, ServerSetup};

use crate::Cipher;

pub struct Registration {}

impl Registration {
  pub fn new() -> Registration {
    Registration {}
  }

  pub fn start(
    &self,
    server_setup: &ServerSetup<Cipher>,
    payload: &[u8],
    credential_identifier: &[u8],
  ) -> Result<Vec<u8>, ProtocolError> {
    let upload = RegistrationRequest::deserialize(payload)?;
    let result = ServerRegistration::<Cipher>::start(
      server_setup,
      upload,
      credential_identifier,
    )?;
    Ok(result.message.serialize().to_vec())
  }

  pub fn finish(
    &self,
    response_payload: &[u8],
  ) -> Result<Vec<u8>, ProtocolError> {
    let upload_payload =
      RegistrationUpload::<Cipher>::deserialize(response_payload)?;
    Ok(
      ServerRegistration::finish(upload_payload)
        .serialize()
        .to_vec(),
    )
  }
}
