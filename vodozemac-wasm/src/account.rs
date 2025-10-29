use std::collections::HashMap;

use wasm_bindgen::prelude::*;

use crate::error_to_js;

use super::{session::Session, OlmMessage};

#[wasm_bindgen]
pub struct Account {
    inner: vodozemac::olm::Account,
}

#[wasm_bindgen(getter_with_clone, setter)]
pub struct SessionConfig {
    inner: vodozemac::olm::SessionConfig,
}


#[wasm_bindgen]
pub struct InboundCreationResult {
    session: Session,
    plaintext: Vec<u8>,
}

#[wasm_bindgen]
impl InboundCreationResult {
    #[wasm_bindgen(getter)]
    pub fn session(self) -> Session {
        self.session
    }

    #[wasm_bindgen(getter)]
    pub fn plaintext(&self) -> Vec<u8> {
        self.plaintext.clone()
    }
}

impl From<vodozemac::olm::InboundCreationResult> for InboundCreationResult {
    fn from(result: vodozemac::olm::InboundCreationResult) -> Self {
        Self {
            session: Session {
                inner: result.session,
            },
            plaintext: result.plaintext,
        }
    }
}

#[wasm_bindgen]
impl Account {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: vodozemac::olm::Account::new(),
        }
    }

    pub fn from_pickle(pickle: &str, pickle_key: &[u8]) -> Result<Account, JsValue> {
        let pickle_key: &[u8; 32] = pickle_key.try_into().map_err(error_to_js)?;

        let pickle = vodozemac::olm::AccountPickle::from_encrypted(pickle, pickle_key)
            .map_err(error_to_js)?;

        let inner = vodozemac::olm::Account::from_pickle(pickle);

        Ok(Self { inner })
    }

    pub fn from_libolm_pickle(pickle: &str, pickle_key: &[u8]) -> Result<Account, JsValue> {
        let inner =
            vodozemac::olm::Account::from_libolm_pickle(pickle, pickle_key).map_err(error_to_js)?;

        Ok(Self { inner })
    }

    pub fn pickle(&self, pickle_key: &[u8]) -> Result<String, JsValue> {
        let pickle_key: &[u8; 32] = pickle_key
            .try_into()
            .map_err(|_| JsError::new("Invalid pickle key length, expected 32 bytes"))?;

        Ok(self.inner.pickle().encrypt(pickle_key))
    }

    #[wasm_bindgen(method, getter)]
    pub fn ed25519_key(&self) -> String {
        self.inner.ed25519_key().to_base64()
    }

    #[wasm_bindgen(method, getter)]
    pub fn curve25519_key(&self) -> String {
        self.inner.curve25519_key().to_base64()
    }

    pub fn sign(&self, message: &str) -> String {
        self.inner.sign(message).to_base64()
    }

    #[wasm_bindgen(method, getter)]
    pub fn max_number_of_one_time_keys(&self) -> usize {
        self.inner.max_number_of_one_time_keys()
    }

    #[wasm_bindgen(method, getter)]
    pub fn one_time_keys(&self) -> Result<JsValue, JsValue> {
        let keys: HashMap<_, _> = self
            .inner
            .one_time_keys()
            .into_iter()
            .map(|(k, v)| (k.to_base64(), v.to_base64()))
            .collect();

        Ok(serde_wasm_bindgen::to_value(&keys)?)
    }

    pub fn generate_one_time_keys(&mut self, count: usize) {
        self.inner.generate_one_time_keys(count);
    }

    #[wasm_bindgen(method, getter)]
    pub fn fallback_key(&self) -> Result<JsValue, JsValue> {
        let keys: HashMap<String, String> = self
            .inner
            .fallback_key()
            .into_iter()
            .map(|(k, v)| (k.to_base64(), v.to_base64()))
            .collect();

        Ok(serde_wasm_bindgen::to_value(&keys)?)
    }

    pub fn generate_fallback_key(&mut self) {
        self.inner.generate_fallback_key();
    }

    pub fn mark_keys_as_published(&mut self) {
        self.inner.mark_keys_as_published()
    }

    pub fn create_outbound_session(
        &self,
        identity_key: &str,
        one_time_key: &str,
    ) -> Result<Session, JsValue> {
        let session_config = vodozemac::olm::SessionConfig::version_1();
        let identity_key =
            vodozemac::Curve25519PublicKey::from_base64(identity_key).map_err(error_to_js)?;
        let one_time_key =
            vodozemac::Curve25519PublicKey::from_base64(one_time_key).map_err(error_to_js)?;
        let session = self
            .inner
            .create_outbound_session(session_config, identity_key, one_time_key);

        Ok(Session { inner: session })
    }

    pub fn create_inbound_session(
        &mut self,
        identity_key: &str,
        message: &OlmMessage,
    ) -> Result<InboundCreationResult, JsValue> {
        let identity_key =
            vodozemac::Curve25519PublicKey::from_base64(identity_key).map_err(error_to_js)?;

        let message =
            vodozemac::olm::OlmMessage::from_parts(message.message_type, &message.ciphertext)
                .map_err(error_to_js)?;

        if let vodozemac::olm::OlmMessage::PreKey(message) = message {
            Ok(self
                .inner
                .create_inbound_session(identity_key, &message)
                .map_err(error_to_js)?
                .into())
        } else {
            Err(JsError::new("Invalid message type, expected a pre-key message").into())
        }
    }
}
