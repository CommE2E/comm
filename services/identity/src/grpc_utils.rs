use std::collections::HashMap;

use tonic::Status;
use tracing::error;

use crate::{
  client_service::client_proto::{
    DeviceKeyUpload, IdentityKeyInfo, InboundKeyInfo, OutboundKeyInfo, PreKey,
    RegistrationStartRequest, ReservedRegistrationStartRequest,
  },
  constants::{
    CONTENT_ONE_TIME_KEY, NOTIF_ONE_TIME_KEY,
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

pub struct DeviceInfoWithAuth<'a> {
  pub device_info: HashMap<String, String>,
  pub auth_type: &'a AuthType,
}

impl TryFrom<DeviceInfoWithAuth<'_>> for InboundKeyInfo {
  type Error = Status;

  fn try_from(data: DeviceInfoWithAuth) -> Result<Self, Self::Error> {
    let mut device_info = data.device_info;

    let identity_info =
      extract_identity_info(&mut device_info, data.auth_type)?;

    Ok(InboundKeyInfo {
      identity_info: Some(identity_info),
      content_prekey: Some(create_prekey(
        &mut device_info,
        USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME,
        USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
      )?),
      notif_prekey: Some(create_prekey(
        &mut device_info,
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME,
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
      )?),
    })
  }
}

impl TryFrom<DeviceInfoWithAuth<'_>> for OutboundKeyInfo {
  type Error = Status;

  fn try_from(data: DeviceInfoWithAuth) -> Result<Self, Self::Error> {
    let mut device_info = data.device_info;

    let identity_info =
      extract_identity_info(&mut device_info, data.auth_type)?;

    let content_one_time_key = device_info.remove(CONTENT_ONE_TIME_KEY);
    let notif_one_time_key = device_info.remove(NOTIF_ONE_TIME_KEY);

    Ok(OutboundKeyInfo {
      identity_info: Some(identity_info),
      content_prekey: Some(create_prekey(
        &mut device_info,
        USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME,
        USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
      )?),
      notif_prekey: Some(create_prekey(
        &mut device_info,
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME,
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
      )?),
      one_time_content_prekey: content_one_time_key,
      one_time_notif_prekey: notif_one_time_key,
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

fn extract_identity_info(
  device_info: &mut HashMap<String, String>,
  auth_type: &AuthType,
) -> Result<IdentityKeyInfo, Status> {
  let payload = extract_key(
    device_info,
    USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME,
  )?;
  let payload_signature = extract_key(
    device_info,
    USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME,
  )?;
  let social_proof =
    device_info.remove(USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME);
  if social_proof.is_none() && auth_type == &AuthType::Wallet {
    error!("Social proof missing for wallet user");
    return Err(Status::failed_precondition("Database item malformed"));
  }

  Ok(IdentityKeyInfo {
    payload,
    payload_signature,
    social_proof,
  })
}

fn create_prekey(
  device_info: &mut HashMap<String, String>,
  key_attr: &str,
  signature_attr: &str,
) -> Result<PreKey, Status> {
  Ok(PreKey {
    pre_key: extract_key(device_info, key_attr)?,
    pre_key_signature: extract_key(device_info, signature_attr)?,
  })
}

pub trait DeviceKeyUploadData {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload>;
  fn username(&self) -> &str;
}

impl DeviceKeyUploadData for RegistrationStartRequest {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload> {
    self.device_key_upload.as_ref()
  }
  fn username(&self) -> &str {
    &self.username
  }
}

impl DeviceKeyUploadData for ReservedRegistrationStartRequest {
  fn device_key_upload(&self) -> Option<&DeviceKeyUpload> {
    self.device_key_upload.as_ref()
  }
  fn username(&self) -> &str {
    &self.username
  }
}

pub trait DeviceKeyUploadActions {
  fn username(&self) -> String;
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
  fn username(&self) -> String {
    self.username().to_string()
  }

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
      .map(|prekey| prekey.pre_key.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn content_prekey_signature(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.content_upload.as_ref())
      .map(|prekey| prekey.pre_key_signature.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn notif_prekey(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.notif_upload.as_ref())
      .map(|prekey| prekey.pre_key.clone())
      .ok_or_else(|| Status::invalid_argument("unexpected message data"))
  }

  fn notif_prekey_signature(&self) -> Result<String, Status> {
    self
      .device_key_upload()
      .and_then(|upload| upload.notif_upload.as_ref())
      .map(|prekey| prekey.pre_key_signature.clone())
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
