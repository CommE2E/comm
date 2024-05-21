use opaque_ke::errors::ProtocolError;
use std::ops::Deref;
use wasm_bindgen::{JsError, JsValue};

/// Due to Rust's orphan rules, we cannot directly bridge
/// opaque_ke::errors::ProtocolError to wasm_bindgen::JsValue. Instead we
/// must define our own type, and add the impl's ourselves
#[derive(Debug)]
pub struct OpaqueError(ProtocolError);

impl From<OpaqueError> for JsValue {
  fn from(value: OpaqueError) -> Self {
    Self::from(protocol_error_to_js_error(value.0))
  }
}

impl From<OpaqueError> for ProtocolError {
  fn from(value: OpaqueError) -> Self {
    value.0
  }
}

impl From<ProtocolError> for OpaqueError {
  fn from(error: ProtocolError) -> OpaqueError {
    OpaqueError(error)
  }
}

impl Deref for OpaqueError {
  type Target = ProtocolError;

  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

fn protocol_error_to_js_error(error: ProtocolError) -> JsError {
  match error {
    ProtocolError::IdentityGroupElementError => JsError::new("server error"),
    ProtocolError::InvalidLoginError => JsError::new("login failed"),
    ProtocolError::LibraryError(_) => JsError::new("internal error"),
    ProtocolError::ReflectedValueError => {
      JsError::new("invalid server response")
    }
    ProtocolError::SerializationError => JsError::new("invalid argument"),
  }
}
