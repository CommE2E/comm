// TODO: get rid of this
#![allow(dead_code)]

use std::collections::HashMap;

use aws_sdk_dynamodb::model::AttributeValue;
use chrono::{DateTime, Utc};

use crate::{
  constants::devices_table::*,
  database::parse_string_attribute,
  ddb_utils::AttributesOptionExt,
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
  pub key_payload: String,
  pub key_payload_signature: String,
  pub social_proof: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PreKey {
  pub pre_key: String,
  pub pre_key_signature: String,
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

    let device_key_info = attrs
      .remove(ATTR_DEVICE_KEY_INFO)
      .ok_or_missing(ATTR_DEVICE_KEY_INFO)?
      .to_hashmap(ATTR_DEVICE_KEY_INFO)
      .cloned()
      .and_then(IdentityKeyInfo::try_from)?;

    let content_prekey = attrs
      .remove(ATTR_CONTENT_PREKEY)
      .ok_or_missing(ATTR_CONTENT_PREKEY)?
      .to_hashmap(ATTR_CONTENT_PREKEY)
      .cloned()
      .and_then(PreKey::try_from)?;

    let notif_prekey = attrs
      .remove(ATTR_NOTIF_PREKEY)
      .ok_or_missing(ATTR_NOTIF_PREKEY)?
      .to_hashmap(ATTR_NOTIF_PREKEY)
      .cloned()
      .and_then(PreKey::try_from)?;

    Ok(Self {
      user_id,
      device_id,
      device_type,
      device_key_info,
      content_prekey,
      notif_prekey,
    })
  }
}

impl From<DeviceRow> for RawAttributes {
  fn from(value: DeviceRow) -> Self {
    HashMap::from([
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
        ATTR_DEVICE_KEY_INFO.to_string(),
        value.device_key_info.into(),
      ),
      (ATTR_CONTENT_PREKEY.to_string(), value.content_prekey.into()),
      (ATTR_NOTIF_PREKEY.to_string(), value.notif_prekey.into()),
    ])
  }
}

impl From<IdentityKeyInfo> for AttributeValue {
  fn from(value: IdentityKeyInfo) -> Self {
    let mut attrs = HashMap::from([
      (
        ATTR_KEY_PAYLOAD.to_string(),
        AttributeValue::S(value.key_payload),
      ),
      (
        ATTR_KEY_PAYLOAD_SIGNATURE.to_string(),
        AttributeValue::S(value.key_payload_signature),
      ),
    ]);
    if let Some(social_proof) = value.social_proof {
      attrs.insert(
        ATTR_SOCIAL_PROOF.to_string(),
        AttributeValue::S(social_proof),
      );
    }
    AttributeValue::M(attrs)
  }
}

impl TryFrom<RawAttributes> for IdentityKeyInfo {
  type Error = DBItemError;
  fn try_from(mut attrs: RawAttributes) -> Result<Self, Self::Error> {
    let key_payload =
      parse_string_attribute(ATTR_KEY_PAYLOAD, attrs.remove(ATTR_KEY_PAYLOAD))?;
    let key_payload_signature = parse_string_attribute(
      ATTR_KEY_PAYLOAD_SIGNATURE,
      attrs.remove(ATTR_KEY_PAYLOAD_SIGNATURE),
    )?;
    // social proof is optional
    let social_proof = attrs
      .remove(ATTR_SOCIAL_PROOF)
      .map(|attr| attr.to_string(ATTR_SOCIAL_PROOF).cloned())
      .transpose()?;

    Ok(Self {
      key_payload,
      key_payload_signature,
      social_proof,
    })
  }
}

impl From<PreKey> for AttributeValue {
  fn from(value: PreKey) -> Self {
    let attrs = HashMap::from([
      (ATTR_PREKEY.to_string(), AttributeValue::S(value.pre_key)),
      (
        ATTR_PREKEY_SIGNATURE.to_string(),
        AttributeValue::S(value.pre_key_signature),
      ),
    ]);
    AttributeValue::M(attrs)
  }
}

impl TryFrom<RawAttributes> for PreKey {
  type Error = DBItemError;
  fn try_from(mut attrs: RawAttributes) -> Result<Self, Self::Error> {
    let pre_key =
      parse_string_attribute(ATTR_PREKEY, attrs.remove(ATTR_PREKEY))?;
    let pre_key_signature = parse_string_attribute(
      ATTR_PREKEY_SIGNATURE,
      attrs.remove(ATTR_PREKEY_SIGNATURE),
    )?;
    Ok(Self {
      pre_key,
      pre_key_signature,
    })
  }
}
