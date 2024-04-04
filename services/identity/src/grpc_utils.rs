use base64::{engine::general_purpose, Engine as _};
use ed25519_dalek::{PublicKey, Signature, Verifier};
use serde::Deserialize;
use tonic::Status;
use tracing::error;

use crate::{
  database::DeviceRow,
  ddb_utils::Identifier as DBIdentifier,
  grpc_services::protos::{
    auth::{EthereumIdentity, Identity, InboundKeyInfo, OutboundKeyInfo},
    unauth::{
      DeviceKeyUpload, ExistingDeviceLoginRequest, OpaqueLoginStartRequest,
      RegistrationStartRequest, ReservedRegistrationStartRequest,
      ReservedWalletRegistrationRequest, SecondaryDeviceKeysUploadRequest,
      WalletAuthRequest,
    },
  },
  siwe::SocialProof,
};

#[derive(Deserialize)]
pub struct ChallengeResponse {
  message: String,
  signature: String,
}

#[derive(Deserialize)]
pub struct NonceChallenge {
  pub nonce: String,
}

impl TryFrom<&SecondaryDeviceKeysUploadRequest> for ChallengeResponse {
  type Error = Status;
  fn try_from(
    value: &SecondaryDeviceKeysUploadRequest,
  ) -> Result<Self, Self::Error> {
    serde_json::from_str(&value.challenge_response)
      .map_err(|_| Status::invalid_argument("message format invalid"))
  }
}

impl TryFrom<&ExistingDeviceLoginRequest> for ChallengeResponse {
  type Error = Status;
  fn try_from(value: &ExistingDeviceLoginRequest) -> Result<Self, Self::Error> {
    serde_json::from_str(&value.challenge_response)
      .map_err(|_| Status::invalid_argument("message format invalid"))
  }
}

impl ChallengeResponse {
  pub fn verify_and_get_message<T: serde::de::DeserializeOwned>(
    &self,
    signing_public_key: &str,
  ) -> Result<T, Status> {
    let signature_bytes = general_purpose::STANDARD_NO_PAD
      .decode(&self.signature)
      .map_err(|_| Status::invalid_argument("signature invalid"))?;

    let signature = Signature::from_bytes(&signature_bytes)
      .map_err(|_| Status::invalid_argument("signature invalid"))?;

    let public_key_bytes = general_purpose::STANDARD_NO_PAD
      .decode(signing_public_key)
      .map_err(|_| Status::failed_precondition("malformed key"))?;

    let public_key: PublicKey = PublicKey::from_bytes(&public_key_bytes)
      .map_err(|_| Status::failed_precondition("malformed key"))?;

    public_key
      .verify(self.message.as_bytes(), &signature)
      .map_err(|_| Status::permission_denied("verification failed"))?;

    serde_json::from_str(&self.message)
      .map_err(|_| Status::invalid_argument("message format invalid"))
  }
}

pub struct DeviceKeysInfo {
  pub device_info: DeviceRow,
  pub content_one_time_key: Option<String>,
  pub notif_one_time_key: Option<String>,
}

impl From<DeviceRow> for DeviceKeysInfo {
  fn from(device_info: DeviceRow) -> Self {
    Self {
      device_info,
      content_one_time_key: None,
      notif_one_time_key: None,
    }
  }
}

impl From<DeviceKeysInfo> for InboundKeyInfo {
  fn from(info: DeviceKeysInfo) -> Self {
    let DeviceKeysInfo { device_info, .. } = info;
    InboundKeyInfo {
      identity_info: Some(device_info.device_key_info.into()),
      content_prekey: Some(device_info.content_prekey.into()),
      notif_prekey: Some(device_info.notif_prekey.into()),
    }
  }
}

impl From<DeviceKeysInfo> for OutboundKeyInfo {
  fn from(info: DeviceKeysInfo) -> Self {
    let DeviceKeysInfo {
      device_info,
      content_one_time_key,
      notif_one_time_key,
    } = info;
    OutboundKeyInfo {
      identity_info: Some(device_info.device_key_info.into()),
      content_prekey: Some(device_info.content_prekey.into()),
      notif_prekey: Some(device_info.notif_prekey.into()),
      one_time_content_prekey: content_one_time_key,
      one_time_notif_prekey: notif_one_time_key,
    }
  }
}

pub trait DeviceKeyUploadData {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload>;
}

impl DeviceKeyUploadData for RegistrationStartRequest {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload> {
    self.device_key_upload.as_ref()
  }
}

impl DeviceKeyUploadData for ReservedRegistrationStartRequest {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload> {
    self.device_key_upload.as_ref()
  }
}

impl DeviceKeyUploadData for OpaqueLoginStartRequest {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload> {
    self.device_key_upload.as_ref()
  }
}

impl DeviceKeyUploadData for WalletAuthRequest {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload> {
    self.device_key_upload.as_ref()
  }
}

impl DeviceKeyUploadData for ReservedWalletRegistrationRequest {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload> {
    self.device_key_upload.as_ref()
  }
}

impl DeviceKeyUploadData for SecondaryDeviceKeysUploadRequest {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload> {
    self.device_key_upload.as_ref()
  }
}

pub trait DeviceKeyUploadActions {
  fn payload(&self) -> Result<String, Status>;
  fn payload_signature(&self) -> Result<String, Status>;
  fn content_prekey(&self) -> Result<String, Status>;
  fn content_prekey_signature(&self) -> Result<String, Status>;
  fn notif_prekey(&self) -> Result<String, Status>;
  fn notif_prekey_signature(&self) -> Result<String, Status>;
  fn one_time_content_prekeys(&self) -> Result<Vec<String>, Status>;
  fn one_time_notif_prekeys(&self) -> Result<Vec<String>, Status>;
  fn device_type(&self) -> Result<i32, Status>;
}

impl<T: DeviceKeyUploadData> DeviceKeyUploadActions for T {
  fn payload(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.device_key_info.as_ref())
      .map(|info| info.payload.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn payload_signature(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.device_key_info.as_ref())
      .map(|info| info.payload_signature.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn content_prekey(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.content_upload.as_ref())
      .map(|prekey| prekey.prekey.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn content_prekey_signature(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.content_upload.as_ref())
      .map(|prekey| prekey.prekey_signature.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn notif_prekey(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.notif_upload.as_ref())
      .map(|prekey| prekey.prekey.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn notif_prekey_signature(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.notif_upload.as_ref())
      .map(|prekey| prekey.prekey_signature.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn one_time_content_prekeys(&self) -> Result<Vec<String>, Status> {
    self
      .device_key_upload()
      .map(|upload| upload.one_time_content_prekeys.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn one_time_notif_prekeys(&self) -> Result<Vec<String>, Status> {
    self
      .device_key_upload()
      .map(|upload| upload.one_time_notif_prekeys.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }
  fn device_type(&self) -> Result<i32, Status> {
    self
      .device_key_upload()
      .map(|upload| upload.device_type)
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }
}

impl From<DBIdentifier> for Identity {
  fn from(value: DBIdentifier) -> Self {
    match value {
      DBIdentifier::Username(username) => Identity {
        username,
        eth_identity: None,
      },
      DBIdentifier::WalletAddress(eth_identity) => Identity {
        username: eth_identity.wallet_address.clone(),
        eth_identity: Some(EthereumIdentity {
          wallet_address: eth_identity.wallet_address,
          siwe_message: eth_identity.social_proof.message,
          siwe_signature: eth_identity.social_proof.signature,
        }),
      },
    }
  }
}

#[cfg(test)]
mod tests {
  use serde_json::json;

  use super::*;

  #[test]
  fn test_challenge_response_verification() {
    let signing_key = "TF6XVmtso2xpCfUWcU1dOTPDnoo+Euls3H4wJhO6T6A";
    let challenge_response_json = json!({
      "message": r#"{"nonce":"hello"}"#,
      "signature": "pXQZc9if5/p926HoomKEtLfe10SNOHdkf3wIXLjax0yg3mOE0z+0JTf+IgsjB7p9RGSisVRfskQQXa30uPupAQ"
    });
    let request = SecondaryDeviceKeysUploadRequest {
      challenge_response: serde_json::to_string(&challenge_response_json)
        .unwrap(),
      user_id: "foo".to_string(),
      device_key_upload: None,
    };

    let challenge_response = ChallengeResponse::try_from(&request)
      .expect("failed to parse challenge response");

    let msg: NonceChallenge = challenge_response
      .verify_and_get_message(signing_key)
      .expect("verification failed");

    assert_eq!(msg.nonce, "hello".to_string());
  }
}
