// TODO: get rid of this
#![allow(dead_code)]

use std::collections::HashMap;

use aws_sdk_dynamodb::model::AttributeValue;
use chrono::{DateTime, Utc};

use crate::{
  constants::devices_table::*,
  database::parse_string_attribute,
  error::{DBItemAttributeError, DBItemError, FromAttributeValue},
  grpc_services::protos::unauth::DeviceType,
};

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

// helper structs for converting to/from attribute values for sort key (a.k.a itemID)
struct DeviceIDAttribute(String);
struct DeviceListKeyAttribute(DateTime<Utc>);

impl From<DeviceIDAttribute> for AttributeValue {
  fn from(value: DeviceIDAttribute) -> Self {
    AttributeValue::S(format!("{DEVICE_ITEM_KEY_PREFIX}{}", value.0))
  }
}

impl TryFrom<Option<AttributeValue>> for DeviceIDAttribute {
  type Error = DBItemError;
  fn try_from(value: Option<AttributeValue>) -> Result<Self, Self::Error> {
    let item_id = parse_string_attribute(ATTR_ITEM_ID, value)?;

    // remove the device- prefix
    let device_id = item_id
      .strip_prefix(DEVICE_ITEM_KEY_PREFIX)
      .ok_or_else(|| DBItemError {
        attribute_name: ATTR_ITEM_ID.to_string(),
        attribute_value: Some(AttributeValue::S(item_id.clone())),
        attribute_error: DBItemAttributeError::InvalidValue,
      })?
      .to_string();

    Ok(Self(device_id))
  }
}

impl TryFrom<RawAttributes> for DeviceRow {
  type Error = DBItemError;

  fn try_from(mut attrs: RawAttributes) -> Result<Self, Self::Error> {
    let user_id =
      parse_string_attribute(ATTR_USER_ID, attrs.remove(ATTR_USER_ID))?;
    let DeviceIDAttribute(device_id) = attrs.remove(ATTR_ITEM_ID).try_into()?;

    let raw_device_type =
      parse_string_attribute(ATTR_DEVICE_TYPE, attrs.remove(ATTR_DEVICE_TYPE))?;
    let device_type =
      DeviceType::from_str_name(&raw_device_type).ok_or_else(|| {
        DBItemError::new(
          ATTR_DEVICE_TYPE.to_string(),
          Some(AttributeValue::S(raw_device_type)),
          DBItemAttributeError::InvalidValue,
        )
      })?;

    let key_payload =
      parse_string_attribute(ATTR_KEY_PAYLOAD, attrs.remove(ATTR_KEY_PAYLOAD))?;
    let key_payload_signature = parse_string_attribute(
      ATTR_KEY_PAYLOAD_SIGNATURE,
      attrs.remove(ATTR_KEY_PAYLOAD_SIGNATURE),
    )?;
    let content_prekey = parse_string_attribute(
      ATTR_CONTENT_PREKEY,
      attrs.remove(ATTR_CONTENT_PREKEY),
    )?;
    let content_prekey_signature = parse_string_attribute(
      ATTR_CONTENT_PREKEY_SIGNATURE,
      attrs.remove(ATTR_CONTENT_PREKEY_SIGNATURE),
    )?;
    let notif_prekey = parse_string_attribute(
      ATTR_NOTIF_PREKEY,
      attrs.remove(ATTR_NOTIF_PREKEY),
    )?;
    let notif_prekey_signature = parse_string_attribute(
      ATTR_NOTIF_PREKEY_SIGNATURE,
      attrs.remove(ATTR_NOTIF_PREKEY_SIGNATURE),
    )?;

    // social proof is optional
    let social_proof = attrs
      .remove(ATTR_SOCIAL_PROOF)
      .map(|attr| attr.to_string(ATTR_SOCIAL_PROOF).cloned())
      .transpose()?;

    Ok(Self {
      user_id,
      device_id,
      device_type,
      key_payload,
      key_payload_signature,
      content_prekey,
      content_prekey_signature,
      notif_prekey,
      notif_prekey_signature,
      social_proof,
    })
  }
}

impl From<DeviceRow> for RawAttributes {
  fn from(value: DeviceRow) -> Self {
    let mut attrs = HashMap::from([
      (ATTR_USER_ID.to_string(), AttributeValue::S(value.user_id)),
      (
        ATTR_ITEM_ID.to_string(),
        DeviceIDAttribute(value.device_id).into(),
      ),
      (
        ATTR_DEVICE_TYPE.to_string(),
        AttributeValue::S(value.device_type.as_str_name().to_string()),
      ),
      (
        ATTR_KEY_PAYLOAD.to_string(),
        AttributeValue::S(value.key_payload),
      ),
      (
        ATTR_KEY_PAYLOAD_SIGNATURE.to_string(),
        AttributeValue::S(value.key_payload_signature),
      ),
      (
        ATTR_CONTENT_PREKEY.to_string(),
        AttributeValue::S(value.content_prekey),
      ),
      (
        ATTR_CONTENT_PREKEY_SIGNATURE.to_string(),
        AttributeValue::S(value.content_prekey_signature),
      ),
      (
        ATTR_NOTIF_PREKEY.to_string(),
        AttributeValue::S(value.notif_prekey),
      ),
      (
        ATTR_NOTIF_PREKEY_SIGNATURE.to_string(),
        AttributeValue::S(value.notif_prekey_signature),
      ),
    ]);

    if let Some(social_proof) = value.social_proof {
      attrs.insert(
        ATTR_SOCIAL_PROOF.to_string(),
        AttributeValue::S(social_proof),
      );
    }

    attrs
  }
}
