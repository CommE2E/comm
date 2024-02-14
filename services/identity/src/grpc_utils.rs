use tonic::Status;

use crate::{
  database::DeviceRow,
  ddb_utils::Identifier as DBIdentifier,
  grpc_services::protos::{
    auth::{
      identity::IdentityInfo, EthereumIdentity, InboundKeyInfo, OutboundKeyInfo,
    },
    unauth::{
      DeviceKeyUpload, OpaqueLoginStartRequest, RegistrationStartRequest,
      ReservedRegistrationStartRequest, ReservedWalletRegistrationRequest,
      WalletAuthRequest,
    },
  },
};

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

impl TryFrom<DBIdentifier> for IdentityInfo {
  type Error = Status;

  fn try_from(value: DBIdentifier) -> Result<Self, Self::Error> {
    match value {
      DBIdentifier::Username(username) => Ok(IdentityInfo::Username(username)),
      DBIdentifier::WalletAddress(eth_identity) => {
        Ok(IdentityInfo::EthIdentity(EthereumIdentity {
          wallet_address: eth_identity.wallet_address,
          social_proof: eth_identity.social_proof,
        }))
      }
    }
  }
}
