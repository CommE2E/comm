use vodozemac::olm;
use vodozemac::olm::MessageType;
use wasm_bindgen::prelude::*;

use crate::error_to_js;

use super::OlmMessage;

#[wasm_bindgen]
pub struct Session {
    pub(super) inner: vodozemac::olm::Session,
}

#[wasm_bindgen]
impl Session {
    pub fn pickle(&self, pickle_key: &[u8]) -> Result<String, JsValue> {
        let pickle_key: &[u8; 32] = pickle_key
            .try_into()
            .map_err(|_| JsError::new("Invalid pickle key length, expected 32 bytes"))?;

        Ok(self.inner.pickle().encrypt(pickle_key))
    }

    pub fn from_pickle(pickle: &str, pickle_key: &[u8]) -> Result<Session, JsValue> {
        let pickle_key: &[u8; 32] = pickle_key
            .try_into()
            .map_err(|_| JsError::new("Invalid pickle key length, expected 32 bytes"))?;
        let pickle = vodozemac::olm::SessionPickle::from_encrypted(pickle, pickle_key)
            .map_err(error_to_js)?;

        let session = vodozemac::olm::Session::from_pickle(pickle);

        Ok(Self { inner: session })
    }

    pub fn from_libolm_pickle(pickle: &str, pickle_key: &[u8]) -> Result<Session, JsValue> {
        let session =
            vodozemac::olm::Session::from_libolm_pickle(pickle, pickle_key).map_err(error_to_js)?;

        Ok(Self { inner: session })
    }

    #[wasm_bindgen(getter)]
    pub fn session_id(&self) -> String {
        self.inner.session_id()
    }

    pub fn session_matches(&self, message: &OlmMessage) -> bool {
        let message =
            vodozemac::olm::OlmMessage::from_parts(message.message_type, &message.ciphertext);

        match message {
            Ok(m) => {
                if let vodozemac::olm::OlmMessage::PreKey(m) = m {
                    self.inner.session_keys() == m.session_keys()
                } else {
                    false
                }
            }
            Err(_) => false,
        }
    }

    pub fn encrypt(&mut self, plaintext: &str) -> OlmMessage {
        let message = self.inner.encrypt(plaintext);

        let (message_type, encrypted_message) = match message {
            vodozemac::olm::OlmMessage::Normal(msg) => (1, msg.to_base64()),
            vodozemac::olm::OlmMessage::PreKey(msg) => (0, msg.to_base64()),
        };

        OlmMessage {
            ciphertext: encrypted_message.into_bytes(),
            message_type,
        }
    }

    pub fn decrypt(&mut self, message: &OlmMessage) -> Result<Vec<u8>, JsValue> {

        let string = String::from_utf8(message.ciphertext.clone()).expect("Invalid UTF-8");

        let olm_message: vodozemac::olm::OlmMessage = match message.message_type {
            0 => olm::PreKeyMessage::from_base64(string.as_str())
                .map_err(|e| e.to_string())?
                .into(),
            1 => olm::Message::from_base64(string.as_str())
                .map_err(|e| e.to_string())?
                .into(),
            _ => return Err(JsValue::from("wrong message type".to_string())),
        };

        Ok(self.inner.decrypt(&olm_message).map_err(error_to_js)?)
    }
}
