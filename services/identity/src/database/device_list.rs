// TODO: get rid of this
#![allow(dead_code)]

use std::collections::HashMap;

use aws_sdk_dynamodb::model::AttributeValue;
use chrono::{DateTime, Utc};

use crate::grpc_services::protos::unauth::DeviceType;

type RawAttributes = HashMap<String, AttributeValue>;

#[derive(Clone, Debug)]
pub enum DevicesTableRow {
  Device(DeviceRow),
  DeviceList(DeviceListRow),
}

#[derive(Clone, Debug)]
pub struct DeviceRow {
  pub user_id: String,
  pub device_id: String,
  pub device_type: DeviceType,
  pub device_key_info: IdentityKeyInfo,
  pub content_prekey: PreKey,
  pub notif_prekey: PreKey,
}

#[derive(Clone, Debug)]
pub struct DeviceListRow {
  pub user_id: String,
  pub timestamp: DateTime<Utc>,
  pub device_ids: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct IdentityKeyInfo {
  pub payload: String,
  pub payload_signature: String,
  pub social_proof: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PreKey {
  pub pre_key: String,
  pub pre_key_signature: String,
}
