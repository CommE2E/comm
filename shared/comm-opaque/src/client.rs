use opaque_ke::{
  errors::ProtocolError, ClientLogin, ClientLoginFinishParameters,
  ClientLoginFinishResult, ClientLoginStartParameters, ClientRegistration,
  ClientRegistrationFinishParameters, CredentialResponse, RegistrationResponse,
};
use rand::rngs::OsRng;

use crate::Cipher;

// These methods are used in other parts of the code base
#[allow(dead_code)]
pub fn register_start(
  password: &[u8],
) -> Result<(ClientRegistration<Cipher>, Vec<u8>), ProtocolError> {
  let res = ClientRegistration::<Cipher>::start(&mut OsRng, password)?;
  Ok((res.state, res.message.serialize()))
}

#[allow(dead_code)]
pub fn register_finish(
  registration_result: ClientRegistration<Cipher>,
  response_payload: &[u8],
) -> Result<Vec<u8>, ProtocolError> {
  let response = RegistrationResponse::deserialize(response_payload)?;
  let result = registration_result.finish(
    &mut OsRng,
    response,
    ClientRegistrationFinishParameters::default(),
  )?;
  Ok(result.message.serialize())
}

#[allow(dead_code)]
pub fn login_start(
  password: &[u8],
) -> Result<(ClientLogin<Cipher>, Vec<u8>), ProtocolError> {
  let start_result = ClientLogin::<Cipher>::start(
    &mut OsRng,
    password,
    ClientLoginStartParameters::default(),
  )?;
  Ok((start_result.state, start_result.message.serialize()?))
}

#[allow(dead_code)]
pub fn login_finish(
  login_result: ClientLogin<Cipher>,
  response_payload: &[u8],
) -> Result<ClientLoginFinishResult<Cipher>, ProtocolError> {
  let response = CredentialResponse::deserialize(response_payload)?;
  login_result.finish(response, ClientLoginFinishParameters::default())
}
