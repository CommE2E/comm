// TODO: get rid of this
#![allow(dead_code)]

use std::collections::HashMap;

use aws_sdk_dynamodb::{client::fluent_builders::Query, model::AttributeValue};
use chrono::{DateTime, Utc};
use tracing::{error, warn};

use crate::{
  constants::{
    devices_table::{self, *},
    USERS_TABLE, USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME,
    USERS_TABLE_PARTITION_KEY,
  },
  database::parse_string_attribute,
  error::{DBItemAttributeError, DBItemError, Error, FromAttributeValue},
  grpc_services::protos::unauth::DeviceType,
};

use super::parse_date_time_attribute;

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

impl From<DeviceListKeyAttribute> for AttributeValue {
  fn from(value: DeviceListKeyAttribute) -> Self {
    AttributeValue::S(format!(
      "{DEVICE_LIST_KEY_PREFIX}{}",
      value.0.to_rfc3339()
    ))
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

impl TryFrom<Option<AttributeValue>> for DeviceListKeyAttribute {
  type Error = DBItemError;
  fn try_from(value: Option<AttributeValue>) -> Result<Self, Self::Error> {
    let item_id = parse_string_attribute(ATTR_ITEM_ID, value)?;

    // remove the device-list- prefix, then parse the timestamp
    let timestamp: DateTime<Utc> = item_id
      .strip_prefix(DEVICE_LIST_KEY_PREFIX)
      .ok_or_else(|| DBItemError {
        attribute_name: ATTR_ITEM_ID.to_string(),
        attribute_value: Some(AttributeValue::S(item_id.clone())),
        attribute_error: DBItemAttributeError::InvalidValue,
      })
      .and_then(|s| {
        s.parse().map_err(|e| {
          DBItemError::new(
            ATTR_ITEM_ID.to_string(),
            Some(AttributeValue::S(item_id.clone())),
            DBItemAttributeError::InvalidTimestamp(e),
          )
        })
      })?;

    Ok(Self(timestamp))
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

impl TryFrom<RawAttributes> for DeviceListRow {
  type Error = DBItemError;

  fn try_from(mut attrs: RawAttributes) -> Result<Self, Self::Error> {
    let user_id =
      parse_string_attribute(ATTR_USER_ID, attrs.remove(ATTR_USER_ID))?;
    let DeviceListKeyAttribute(timestamp) =
      attrs.remove(ATTR_ITEM_ID).try_into()?;

    // validate timestamps are in sync
    let timestamps_match = attrs
      .remove(ATTR_TIMESTAMP)
      .and_then(|attr| attr.as_n().ok().cloned())
      .and_then(|val| val.parse::<i64>().ok())
      .filter(|val| *val == timestamp.timestamp_millis())
      .is_some();
    if !timestamps_match {
      warn!(
        "DeviceList timestamp mismatch for (userID={}, itemID={})",
        &user_id,
        timestamp.to_rfc3339()
      );
    }

    // this should be a list of strings
    let device_ids = attrs
      .remove(ATTR_DEVICE_IDS)
      .ok_or_else(|| {
        DBItemError::new(
          ATTR_DEVICE_IDS.to_string(),
          None,
          DBItemAttributeError::Missing,
        )
      })?
      .to_vec(ATTR_DEVICE_IDS)?
      .iter()
      .map(|v| v.to_string("device_ids[?]").cloned())
      .collect::<Result<Vec<String>, DBItemError>>()?;

    Ok(Self {
      user_id,
      timestamp,
      device_ids,
    })
  }
}

impl From<DeviceListRow> for RawAttributes {
  fn from(device_list: DeviceListRow) -> Self {
    let mut attrs = HashMap::new();
    attrs.insert(
      ATTR_USER_ID.to_string(),
      AttributeValue::S(device_list.user_id.clone()),
    );
    attrs.insert(
      ATTR_ITEM_ID.to_string(),
      DeviceListKeyAttribute(device_list.timestamp).into(),
    );
    attrs.insert(
      ATTR_TIMESTAMP.to_string(),
      AttributeValue::N(device_list.timestamp.timestamp_millis().to_string()),
    );
    attrs.insert(
      ATTR_DEVICE_IDS.to_string(),
      AttributeValue::L(
        device_list
          .device_ids
          .into_iter()
          .map(AttributeValue::S)
          .collect(),
      ),
    );
    attrs
  }
}

/// Retrieves user's current devices and their full data
pub async fn get_current_devices(
  db: &crate::database::DatabaseClient,
  user_id: impl Into<String>,
) -> Result<Vec<DeviceRow>, Error> {
  let response = query_rows_with_prefix(db, user_id, DEVICE_ITEM_KEY_PREFIX)
    .send()
    .await
    .map_err(|e| {
      error!("Failed to get current devices: {:?}", e);
      Error::AwsSdk(e.into())
    })?;

  let Some(rows) = response.items else {
    return Ok(Vec::new());
  };

  rows
    .into_iter()
    .map(DeviceRow::try_from)
    .collect::<Result<Vec<DeviceRow>, DBItemError>>()
    .map_err(Error::from)
}

/// Gets timestamp of user's current device list. Returns None if the user
/// doesn't have a device lsit yet. Storing the timestamp in the users table is
/// required for consistency. It's used as a condition when updating the device
/// list.
async fn get_current_devicelist_timestamp(
  db: &crate::database::DatabaseClient,
  user_id: impl Into<String>,
) -> Result<Option<DateTime<Utc>>, Error> {
  let response = db
    .client
    .get_item()
    .table_name(USERS_TABLE)
    .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id.into()))
    .projection_expression(USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME)
    .send()
    .await
    .map_err(|e| {
      error!("Failed to get user's device list timestamp: {:?}", e);
      Error::AwsSdk(e.into())
    })?;

  let mut user_item = response.item.unwrap_or_default();
  let raw_datetime =
    user_item.remove(USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME);

  // existing records will not have this field when
  // updating device list for the first time
  if raw_datetime.is_none() {
    return Ok(None);
  }

  let timestamp = parse_date_time_attribute(
    USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME,
    raw_datetime,
  )?;
  Ok(Some(timestamp))
}

/// Helper function to query rows by given sort key prefix
fn query_rows_with_prefix(
  db: &crate::database::DatabaseClient,
  user_id: impl Into<String>,
  prefix: &'static str,
) -> Query {
  db.client
    .query()
    .table_name(devices_table::NAME)
    .key_condition_expression(
      "#user_id = :user_id AND begins_with(#item_id, :device_prefix)",
    )
    .expression_attribute_names("#user_id", ATTR_USER_ID)
    .expression_attribute_names("#item_id", ATTR_ITEM_ID)
    .expression_attribute_values(":user_id", AttributeValue::S(user_id.into()))
    .expression_attribute_values(
      ":device_prefix",
      AttributeValue::S(prefix.to_string()),
    )
}
