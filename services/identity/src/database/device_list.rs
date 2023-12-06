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
  // identity key info
  pub key_payload: String,
  pub key_payload_signature: String,
  pub social_proof: Option<String>,
  // content prekey
  pub content_prekey: String,
  pub content_prekey_signature: String,
  // notif prekey
  pub notif_prekey: String,
  pub notif_prekey_signature: String,
}

#[derive(Clone, Debug)]
pub struct DeviceListRow {
  pub user_id: String,
  pub timestamp: DateTime<Utc>,
  pub device_ids: Vec<String>,
}
