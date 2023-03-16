use opaque_ke::{
  errors::ProtocolError, ClientLogin, ClientLoginFinishParameters,
  CredentialResponse,
};
use rand::rngs::OsRng;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{error::OpaqueError, Cipher};

#[wasm_bindgen]
pub struct Login {
  state: Option<ClientLogin<Cipher>>,
  password: Option<String>,
  rng: OsRng,
  export_key: Option<Vec<u8>>,
  session_key: Option<Vec<u8>>,
}

#[wasm_bindgen]
impl Login {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Login {
    Login {
      state: None,
      password: None,
      rng: OsRng,
      session_key: None,
      export_key: None,
    }
  }

  #[wasm_bindgen]
  pub fn start(&mut self, password: &str) -> Result<Vec<u8>, OpaqueError> {
    let client_start_result =
      ClientLogin::<Cipher>::start(&mut self.rng, password.as_bytes())?;
    self.state = Some(client_start_result.state);
    self.password = Some(password.to_string());
    Ok(client_start_result.message.serialize().to_vec())
  }

  #[wasm_bindgen]
  pub fn finish(
    &mut self,
    response_payload: &[u8],
  ) -> Result<Vec<u8>, OpaqueError> {
    let response = CredentialResponse::deserialize(response_payload)?;
    let password = self
      .password
      .take()
      .ok_or_else(|| ProtocolError::InvalidLoginError)?;
    let state = self
      .state
      .take()
      .ok_or_else(|| ProtocolError::InvalidLoginError)?;
    let result = state.finish(
      password.as_bytes(),
      response,
      ClientLoginFinishParameters::default(),
    )?;

    self.session_key = Some(result.session_key.to_vec());
    self.export_key = Some(result.export_key.to_vec());

    Ok(result.message.serialize().to_vec())
  }

  #[wasm_bindgen(getter)]
  pub fn session_key(&self) -> Result<Vec<u8>, OpaqueError> {
    match &self.session_key {
      Some(v) => Ok(v.clone()),
      None => Err(ProtocolError::InvalidLoginError.into()),
    }
  }
}
