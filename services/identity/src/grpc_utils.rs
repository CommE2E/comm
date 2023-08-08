use std::collections::HashMap;

use tonic::Status;
use tracing::error;

use crate::{
  client_service::client_proto::{IdentityKeyInfo, InboundKeyInfo, PreKey},
  constants::{
    USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME,
  },
  database::DeviceKeys,
  token::AuthType,
};

struct DeviceInfoWithAuth<'a> {
  device_info: HashMap<String, String>,
  auth_type: &'a AuthType,
}

impl<'a> TryFrom<DeviceInfoWithAuth<'_>> for InboundKeyInfo {
  type Error = tonic::Status;

  fn try_from(data: DeviceInfoWithAuth) -> Result<Self, Self::Error> {
    let mut device_info = data.device_info;

    let payload = extract_key(
      &mut device_info,
      USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME,
    )?;
    let payload_signature = extract_key(
      &mut device_info,
      USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME,
    )?;

    let social_proof =
      device_info.remove(USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME);
    if social_proof.is_none() && data.auth_type == &AuthType::Wallet {
      error!("Social proof missing for wallet user");
      return Err(tonic::Status::failed_precondition(
        "Database item malformed",
      ));
    }

    let identity_info = IdentityKeyInfo {
      payload,
      payload_signature,
      social_proof,
    };

    let mut create_prekey =
      |key_attr, signature_attr| -> Result<PreKey, Status> {
        Ok(PreKey {
          pre_key: extract_key(&mut device_info, key_attr)?,
          pre_key_signature: extract_key(&mut device_info, signature_attr)?,
        })
      };

    Ok(InboundKeyInfo {
      identity_info: Some(identity_info),
      content_prekey: Some(create_prekey(
        USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME,
        USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
      )?),
      notif_prekey: Some(create_prekey(
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME,
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
      )?),
    })
  }
}

fn extract_key(
  device_info: &mut DeviceKeys,
  key: &str,
) -> Result<String, Status> {
  device_info.remove(key).ok_or_else(|| {
    error!("{} missing from device info", key);
    Status::failed_precondition("Database item malformed")
  })
}
