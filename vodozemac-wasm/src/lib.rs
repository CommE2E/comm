#![allow(clippy::new_without_default)]

mod account;

mod session;

pub use account::Account;
pub use session::Session;

use wasm_bindgen::prelude::*;

fn error_to_js(error: impl std::error::Error) -> JsError {
    JsError::new(&error.to_string())
}

#[wasm_bindgen(getter_with_clone, setter)]
pub struct OlmMessage {
    pub ciphertext: Vec<u8>,
    pub message_type: usize,
}

#[wasm_bindgen]
impl OlmMessage {
    #[wasm_bindgen(constructor)]
    pub fn new(message_type: usize, ciphertext: Vec<u8>) -> Self {
        Self {
            ciphertext,
            message_type,
        }
    }
}