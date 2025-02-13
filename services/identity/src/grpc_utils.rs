use base64::{engine::general_purpose, Engine as _};
use ed25519_dalek::{PublicKey, Signature, Verifier};
use serde::Deserialize;
use tonic::Status;
use tracing::warn;

use crate::{
  constants::tonic_status_messages,
  database::{DeviceListUpdate, DeviceRow, KeyPayload},
  ddb_utils::{DBIdentity, Identifier as DBIdentifier},
  device_list::SignedDeviceList,
  grpc_services::protos::{
    auth::{EthereumIdentity, Identity, InboundKeyInfo, OutboundKeyInfo},
    unauth::{
      DeviceKeyUpload, ExistingDeviceLoginRequest, OpaqueLoginStartRequest,
      RegistrationStartRequest, ReservedRegistrationStartRequest,
      RestoreUserRequest, SecondaryDeviceKeysUploadRequest, WalletAuthRequest,
    },
  },
};

#[derive(Deserialize)]
pub struct SignedNonce {
  nonce: String,
  signature: String,
}

impl TryFrom<&SecondaryDeviceKeysUploadRequest> for SignedNonce {
  type Error = Status;
  fn try_from(
    value: &SecondaryDeviceKeysUploadRequest,
  ) -> Result<Self, Self::Error> {
    Ok(Self {
      nonce: value.nonce.to_string(),
      signature: value.nonce_signature.to_string(),
    })
  }
}

impl TryFrom<&ExistingDeviceLoginRequest> for SignedNonce {
  type Error = Status;
  fn try_from(value: &ExistingDeviceLoginRequest) -> Result<Self, Self::Error> {
    Ok(Self {
      nonce: value.nonce.to_string(),
      signature: value.nonce_signature.to_string(),
    })
  }
}

impl SignedNonce {
  pub fn verify_and_get_nonce(
    self,
    signing_public_key: &str,
  ) -> Result<String, Status> {
    ed25519_verify(signing_public_key, self.nonce.as_bytes(), &self.signature)?;
    Ok(self.nonce)
  }
}

/// Verifies ed25519-signed message. Returns Ok if the signature is valid.
/// Public key and signature should be base64-encoded strings.
pub fn ed25519_verify(
  signing_public_key_base64: &str,
  message_bytes: &[u8],
  signature_base64: &str,
) -> Result<(), Status> {
  let signature_bytes = general_purpose::STANDARD_NO_PAD
    .decode(signature_base64)
    .map_err(|_| {
      Status::invalid_argument(tonic_status_messages::SIGNATURE_INVALID)
    })?;

  let signature = Signature::from_bytes(&signature_bytes).map_err(|_| {
    Status::invalid_argument(tonic_status_messages::SIGNATURE_INVALID)
  })?;

  let public_key_bytes = general_purpose::STANDARD_NO_PAD
    .decode(signing_public_key_base64)
    .map_err(|_| {
      Status::failed_precondition(tonic_status_messages::MALFORMED_KEY)
    })?;

  let public_key: PublicKey = PublicKey::from_bytes(&public_key_bytes)
    .map_err(|_| {
      Status::failed_precondition(tonic_status_messages::MALFORMED_KEY)
    })?;

  public_key.verify(message_bytes, &signature).map_err(|_| {
    Status::permission_denied(tonic_status_messages::VERIFICATION_FAILED)
  })?;
  Ok(())
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

impl DeviceKeyUploadData for SecondaryDeviceKeysUploadRequest {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload> {
    self.device_key_upload.as_ref()
  }
}

impl DeviceKeyUploadData for RestoreUserRequest {
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
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::UNEXPECTED_MESSAGE_DATA)
      })
  }

  fn payload_signature(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.device_key_info.as_ref())
      .map(|info| info.payload_signature.clone())
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::UNEXPECTED_MESSAGE_DATA)
      })
  }

  fn content_prekey(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.content_upload.as_ref())
      .map(|prekey| prekey.prekey.clone())
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::UNEXPECTED_MESSAGE_DATA)
      })
  }

  fn content_prekey_signature(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.content_upload.as_ref())
      .map(|prekey| prekey.prekey_signature.clone())
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::UNEXPECTED_MESSAGE_DATA)
      })
  }

  fn notif_prekey(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.notif_upload.as_ref())
      .map(|prekey| prekey.prekey.clone())
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::UNEXPECTED_MESSAGE_DATA)
      })
  }

  fn notif_prekey_signature(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.notif_upload.as_ref())
      .map(|prekey| prekey.prekey_signature.clone())
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::UNEXPECTED_MESSAGE_DATA)
      })
  }

  fn one_time_content_prekeys(&self) -> Result<Vec<String>, Status> {
    self
      .device_key_upload()
      .map(|upload| upload.one_time_content_prekeys.clone())
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::UNEXPECTED_MESSAGE_DATA)
      })
  }

  fn one_time_notif_prekeys(&self) -> Result<Vec<String>, Status> {
    self
      .device_key_upload()
      .map(|upload| upload.one_time_notif_prekeys.clone())
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::UNEXPECTED_MESSAGE_DATA)
      })
  }
  fn device_type(&self) -> Result<i32, Status> {
    self
      .device_key_upload()
      .map(|upload| upload.device_type)
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::UNEXPECTED_MESSAGE_DATA)
      })
  }
}

/// Common functionality for registration request messages
trait RegistrationData {
  fn initial_device_list(&self) -> &str;
}

impl RegistrationData for RegistrationStartRequest {
  fn initial_device_list(&self) -> &str {
    &self.initial_device_list
  }
}
impl RegistrationData for ReservedRegistrationStartRequest {
  fn initial_device_list(&self) -> &str {
    &self.initial_device_list
  }
}
impl RegistrationData for WalletAuthRequest {
  fn initial_device_list(&self) -> &str {
    &self.initial_device_list
  }
}

/// Similar to `[DeviceKeyUploadActions]` but only for registration requests
pub trait RegistrationActions {
  fn get_and_verify_initial_device_list(
    &self,
  ) -> Result<Option<SignedDeviceList>, tonic::Status>;
}

impl<T: RegistrationData + DeviceKeyUploadActions> RegistrationActions for T {
  fn get_and_verify_initial_device_list(
    &self,
  ) -> Result<Option<SignedDeviceList>, tonic::Status> {
    let payload = self.initial_device_list();
    if payload.is_empty() {
      return Ok(None);
    }
    let signed_list: SignedDeviceList = payload.parse().map_err(|err| {
      warn!("Failed to deserialize initial device list: {}", err);
      tonic::Status::invalid_argument(
        tonic_status_messages::INVALID_DEVICE_LIST_PAYLOAD,
      )
    })?;

    let key_info = self.payload()?.parse::<KeyPayload>().map_err(|_| {
      tonic::Status::invalid_argument(tonic_status_messages::MALFORMED_PAYLOAD)
    })?;
    let primary_device_id = key_info.primary_identity_public_keys.ed25519;

    let update_payload = DeviceListUpdate::try_from(signed_list.clone())?;
    crate::device_list::verify_singleton_device_list(
      &update_payload,
      &primary_device_id,
      None,
    )?;

    Ok(Some(signed_list))
  }
}

impl From<DBIdentity> for Identity {
  fn from(value: DBIdentity) -> Self {
    match value.identifier {
      DBIdentifier::Username(username) => Identity {
        username,
        eth_identity: None,
        farcaster_id: value.farcaster_id,
      },
      DBIdentifier::WalletAddress(eth_identity) => Identity {
        username: eth_identity.wallet_address.clone(),
        eth_identity: Some(EthereumIdentity {
          wallet_address: eth_identity.wallet_address,
          siwe_message: eth_identity.social_proof.message,
          siwe_signature: eth_identity.social_proof.signature,
        }),
        farcaster_id: value.farcaster_id,
      },
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_challenge_response_verification() {
    let expected_nonce = "hello";
    let signing_key = "jnBariweGMSdfmJYvuObTu4IGT1fpaJTo/ovbkU0SAY";

    let request = SecondaryDeviceKeysUploadRequest {
      nonce: expected_nonce.to_string(),
      nonce_signature: "LWlgCDND3bmgIS8liW/0eKJvuNs4Vcb4iMf43zD038/MnC0cSAYl2l3bO9dFc0fa2w6/2ABsUlPDMVr+isE0Aw".to_string(),
      user_id: "foo".to_string(),
      device_key_upload: None,
    };

    let challenge_response = SignedNonce::try_from(&request)
      .expect("failed to parse challenge response");

    let retrieved_nonce = challenge_response
      .verify_and_get_nonce(signing_key)
      .expect("verification failed");

    assert_eq!(retrieved_nonce, expected_nonce);
  }
}
