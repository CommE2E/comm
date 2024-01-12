use std::collections::HashMap;

use chrono::{DateTime, Utc};
use comm_lib::{
  aws::ddb::{
    operation::{get_item::GetItemOutput, query::builders::QueryFluentBuilder},
    types::{
      error::TransactionCanceledException, AttributeValue, Delete,
      DeleteRequest, Put, TransactWriteItem, Update, WriteRequest,
    },
  },
  database::{
    AttributeExtractor, AttributeMap, DBItemAttributeError, DBItemError,
    DynamoDBError, TryFromAttribute,
  },
};
use tracing::{error, warn};

use crate::{
  client_service::FlattenedDeviceKeyUpload,
  constants::{
    devices_table::{self, *},
    USERS_TABLE, USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
    USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME,
    USERS_TABLE_PARTITION_KEY,
  },
  ddb_utils::AttributesOptionExt,
  error::{DeviceListError, Error, FromAttributeValue},
  grpc_services::protos::unauth::DeviceType,
};

use super::DatabaseClient;

#[derive(Clone, Debug)]
pub struct DeviceRow {
  pub user_id: String,
  pub device_id: String,
  pub device_type: DeviceType,
  pub device_key_info: IdentityKeyInfo,
  pub content_prekey: PreKey,
  pub notif_prekey: PreKey,

  // migration-related data
  pub code_version: u64,
  /// Timestamp of last login (access token generation)
  pub login_time: DateTime<Utc>,
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

impl DeviceRow {
  pub fn from_device_key_upload(
    user_id: impl Into<String>,
    upload: FlattenedDeviceKeyUpload,
    social_proof: Option<String>,
    code_version: u64,
    login_time: DateTime<Utc>,
  ) -> Self {
    Self {
      user_id: user_id.into(),
      device_id: upload.device_id_key,
      device_type: DeviceType::from_str_name(upload.device_type.as_str_name())
        .expect("DeviceType conversion failed. Identity client and server protos mismatch"),
      device_key_info: IdentityKeyInfo {
        key_payload: upload.key_payload,
        key_payload_signature: upload.key_payload_signature,
        social_proof,
      },
      content_prekey: PreKey {
        pre_key: upload.content_prekey,
        pre_key_signature: upload.content_prekey_signature,
      },
      notif_prekey: PreKey {
        pre_key: upload.notif_prekey,
        pre_key_signature: upload.notif_prekey_signature,
      },
      code_version,
      login_time,
    }
  }
}

impl DeviceListRow {
  /// Generates new device list row from given devices
  fn new(user_id: impl Into<String>, device_ids: Vec<String>) -> Self {
    Self {
      user_id: user_id.into(),
      device_ids,
      timestamp: Utc::now(),
    }
  }
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
    let item_id = String::try_from_attr(ATTR_ITEM_ID, value)?;

    // remove the device- prefix
    let device_id = item_id
      .strip_prefix(DEVICE_ITEM_KEY_PREFIX)
      .ok_or_else(|| DBItemError {
        attribute_name: ATTR_ITEM_ID.to_string(),
        attribute_value: item_id.clone().into(),
        attribute_error: DBItemAttributeError::InvalidValue,
      })?
      .to_string();

    Ok(Self(device_id))
  }
}

impl TryFrom<Option<AttributeValue>> for DeviceListKeyAttribute {
  type Error = DBItemError;
  fn try_from(value: Option<AttributeValue>) -> Result<Self, Self::Error> {
    let item_id = String::try_from_attr(ATTR_ITEM_ID, value)?;

    // remove the device-list- prefix, then parse the timestamp
    let timestamp: DateTime<Utc> = item_id
      .strip_prefix(DEVICE_LIST_KEY_PREFIX)
      .ok_or_else(|| DBItemError {
        attribute_name: ATTR_ITEM_ID.to_string(),
        attribute_value: item_id.clone().into(),
        attribute_error: DBItemAttributeError::InvalidValue,
      })
      .and_then(|s| {
        s.parse().map_err(|e| {
          DBItemError::new(
            ATTR_ITEM_ID.to_string(),
            item_id.clone().into(),
            DBItemAttributeError::InvalidTimestamp(e),
          )
        })
      })?;

    Ok(Self(timestamp))
  }
}

impl TryFrom<AttributeMap> for DeviceRow {
  type Error = DBItemError;

  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let user_id = attrs.take_attr(ATTR_USER_ID)?;
    let DeviceIDAttribute(device_id) = attrs.remove(ATTR_ITEM_ID).try_into()?;

    let raw_device_type: String = attrs.take_attr(ATTR_DEVICE_TYPE)?;
    let device_type =
      DeviceType::from_str_name(&raw_device_type).ok_or_else(|| {
        DBItemError::new(
          ATTR_DEVICE_TYPE.to_string(),
          raw_device_type.into(),
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

    let code_version = attrs
      .remove(ATTR_CODE_VERSION)
      .and_then(|attr| attr.as_n().ok().cloned())
      .and_then(|val| val.parse::<u64>().ok())
      .unwrap_or_default();

    let login_time: DateTime<Utc> = attrs.take_attr(ATTR_LOGIN_TIME)?;

    Ok(Self {
      user_id,
      device_id,
      device_type,
      device_key_info,
      content_prekey,
      notif_prekey,
      code_version,
      login_time,
    })
  }
}

impl From<DeviceRow> for AttributeMap {
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
      // migration attributes
      (
        ATTR_CODE_VERSION.to_string(),
        AttributeValue::N(value.code_version.to_string()),
      ),
      (
        ATTR_LOGIN_TIME.to_string(),
        AttributeValue::S(value.login_time.to_rfc3339()),
      ),
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

impl TryFrom<AttributeMap> for IdentityKeyInfo {
  type Error = DBItemError;
  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let key_payload = attrs.take_attr(ATTR_KEY_PAYLOAD)?;
    let key_payload_signature = attrs.take_attr(ATTR_KEY_PAYLOAD_SIGNATURE)?;
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

impl TryFrom<AttributeMap> for PreKey {
  type Error = DBItemError;
  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let pre_key = attrs.take_attr(ATTR_PREKEY)?;
    let pre_key_signature = attrs.take_attr(ATTR_PREKEY_SIGNATURE)?;
    Ok(Self {
      pre_key,
      pre_key_signature,
    })
  }
}

impl TryFrom<AttributeMap> for DeviceListRow {
  type Error = DBItemError;

  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let user_id = attrs.take_attr(ATTR_USER_ID)?;
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

    let device_ids: Vec<String> = attrs.take_attr(ATTR_DEVICE_IDS)?;

    Ok(Self {
      user_id,
      timestamp,
      device_ids,
    })
  }
}

impl From<DeviceListRow> for AttributeMap {
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

impl DatabaseClient {
  /// Retrieves user's current devices and their full data
  pub async fn get_current_devices(
    &self,
    user_id: impl Into<String>,
  ) -> Result<Vec<DeviceRow>, Error> {
    let response =
      query_rows_with_prefix(self, user_id, DEVICE_ITEM_KEY_PREFIX)
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

  /// Gets user's device list history
  pub async fn get_device_list_history(
    &self,
    user_id: impl Into<String>,
    since: Option<DateTime<Utc>>,
  ) -> Result<Vec<DeviceListRow>, Error> {
    let rows = if let Some(since) = since {
      // When timestamp is provided, it's better to query device lists by timestamp LSI
      self
        .client
        .query()
        .table_name(devices_table::NAME)
        .index_name(devices_table::TIMESTAMP_INDEX_NAME)
        .consistent_read(true)
        .key_condition_expression("#user_id = :user_id AND #timestamp > :since")
        .expression_attribute_names("#user_id", ATTR_USER_ID)
        .expression_attribute_names("#timestamp", ATTR_TIMESTAMP)
        .expression_attribute_values(
          ":user_id",
          AttributeValue::S(user_id.into()),
        )
        .expression_attribute_values(
          ":since",
          AttributeValue::N(since.timestamp_millis().to_string()),
        )
        .send()
        .await
        .map_err(|e| {
          error!("Failed to query device list updates by index: {:?}", e);
          Error::AwsSdk(e.into())
        })?
        .items
    } else {
      // Query all device lists for user
      query_rows_with_prefix(self, user_id, DEVICE_LIST_KEY_PREFIX)
        .send()
        .await
        .map_err(|e| {
          error!("Failed to query device list updates (all): {:?}", e);
          Error::AwsSdk(e.into())
        })?
        .items
    };

    rows
      .unwrap_or_default()
      .into_iter()
      .map(DeviceListRow::try_from)
      .collect::<Result<Vec<DeviceListRow>, DBItemError>>()
      .map_err(Error::from)
  }

  /// Returns all devices' keys for the given user. Response is in the same format
  /// as [DatabaseClient::get_keys_for_user] for compatibility reasons.
  pub async fn get_keys_for_user_devices(
    &self,
    user_id: impl Into<String>,
  ) -> Result<super::Devices, Error> {
    let user_devices = self.get_current_devices(user_id).await?;

    let user_devices_keys: super::Devices = user_devices
      .into_iter()
      .map(|device| {
        // convert this to the map type returned by DatabaseClient::get_keys_for_user
        let mut device_keys: super::DeviceKeys = HashMap::from([
          (
            USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME.to_string(),
            device.device_key_info.key_payload,
          ),
          (
            USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME
              .to_string(),
            device.device_key_info.key_payload_signature,
          ),
          (
            USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME.to_string(),
            device.content_prekey.pre_key,
          ),
          (
            USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME
              .to_string(),
            device.content_prekey.pre_key_signature,
          ),
          (
            USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME.to_string(),
            device.notif_prekey.pre_key,
          ),
          (
            USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME
              .to_string(),
            device.notif_prekey.pre_key_signature,
          ),
        ]);

        if let Some(social_proof) = device.device_key_info.social_proof {
          device_keys.insert(
            USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME.to_string(),
            social_proof,
          );
        }

        (device.device_id, device_keys)
      })
      .collect();

    Ok(user_devices_keys)
  }

  pub async fn update_device_prekeys(
    &self,
    user_id: impl Into<String>,
    device_id: impl Into<String>,
    content_prekey: String,
    content_prekey_signature: String,
    notif_prekey: String,
    notif_prekey_signature: String,
  ) -> Result<(), Error> {
    let content_prekey = PreKey {
      pre_key: content_prekey,
      pre_key_signature: content_prekey_signature,
    };
    let notif_prekey = PreKey {
      pre_key: notif_prekey,
      pre_key_signature: notif_prekey_signature,
    };

    self
      .client
      .update_item()
      .table_name(devices_table::NAME)
      .key(ATTR_USER_ID, AttributeValue::S(user_id.into()))
      .key(ATTR_ITEM_ID, DeviceIDAttribute(device_id.into()).into())
      .condition_expression(
        "attribute_exists(#user_id) AND attribute_exists(#item_id)",
      )
      .update_expression(
        "SET #content_prekey = :content_prekey, #notif_prekey = :notif_prekey",
      )
      .expression_attribute_names("#user_id", ATTR_USER_ID)
      .expression_attribute_names("#item_id", ATTR_ITEM_ID)
      .expression_attribute_names("#content_prekey", ATTR_CONTENT_PREKEY)
      .expression_attribute_names("#notif_prekey", ATTR_NOTIF_PREKEY)
      .expression_attribute_values(":content_prekey", content_prekey.into())
      .expression_attribute_values(":notif_prekey", notif_prekey.into())
      .send()
      .await
      .map_err(|e| {
        error!("Failed to update device prekeys: {:?}", e);
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  /// Checks if given device exists on user's current device list
  pub async fn device_exists(
    &self,
    user_id: impl Into<String>,
    device_id: impl Into<String>,
  ) -> Result<bool, Error> {
    let GetItemOutput { item, .. } = self
      .client
      .get_item()
      .table_name(devices_table::NAME)
      .key(ATTR_USER_ID, AttributeValue::S(user_id.into()))
      .key(ATTR_ITEM_ID, DeviceIDAttribute(device_id.into()).into())
      // only fetch the primary key, we don't need the rest
      .projection_expression(format!("{ATTR_USER_ID}, {ATTR_ITEM_ID}"))
      .send()
      .await
      .map_err(|e| {
        error!("Failed to check if device exists: {:?}", e);
        Error::AwsSdk(e.into())
      })?;

    Ok(item.is_some())
  }

  /// Required only for migration purposes (determining primary device)
  pub async fn update_device_login_time(
    &self,
    user_id: impl Into<String>,
    device_id: impl Into<String>,
    login_time: DateTime<Utc>,
  ) -> Result<(), Error> {
    self
      .client
      .update_item()
      .table_name(devices_table::NAME)
      .key(ATTR_USER_ID, AttributeValue::S(user_id.into()))
      .key(ATTR_ITEM_ID, DeviceIDAttribute(device_id.into()).into())
      .condition_expression(
        "attribute_exists(#user_id) AND attribute_exists(#item_id)",
      )
      .update_expression("SET #login_time = :login_time")
      .expression_attribute_names("#user_id", ATTR_USER_ID)
      .expression_attribute_names("#item_id", ATTR_ITEM_ID)
      .expression_attribute_names("#login_time", ATTR_LOGIN_TIME)
      .expression_attribute_values(
        ":login_time",
        AttributeValue::S(login_time.to_rfc3339()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("Failed to update device login time: {:?}", e);
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn get_current_device_list(
    &self,
    user_id: impl Into<String>,
  ) -> Result<Option<DeviceListRow>, Error> {
    self
      .client
      .query()
      .table_name(devices_table::NAME)
      .index_name(devices_table::TIMESTAMP_INDEX_NAME)
      .consistent_read(true)
      .key_condition_expression("#user_id = :user_id")
      // sort descending
      .scan_index_forward(false)
      .expression_attribute_names("#user_id", ATTR_USER_ID)
      .expression_attribute_values(
        ":user_id",
        AttributeValue::S(user_id.into()),
      )
      .limit(1)
      .send()
      .await
      .map_err(|e| {
        error!("Failed to query device list updates by index: {:?}", e);
        Error::AwsSdk(e.into())
      })?
      .items
      .and_then(|mut items| items.pop())
      .map(DeviceListRow::try_from)
      .transpose()
      .map_err(Error::from)
  }

  /// Adds new device to user's device list. If the device already exists, the
  /// operation fails. Transactionally generates new device list version.
  pub async fn add_device(
    &self,
    user_id: impl Into<String>,
    device_key_upload: FlattenedDeviceKeyUpload,
    social_proof: Option<String>,
    code_version: u64,
    login_time: DateTime<Utc>,
  ) -> Result<(), Error> {
    let user_id: String = user_id.into();
    self
      .transact_update_devicelist(&user_id, |ref mut device_ids| {
        let new_device = DeviceRow::from_device_key_upload(
          &user_id,
          device_key_upload,
          social_proof,
          code_version,
          login_time,
        );

        if device_ids.iter().any(|id| &new_device.device_id == id) {
          warn!(
            "Device already exists in user's device list \
              (userID={}, deviceID={})",
            &user_id, &new_device.device_id
          );
          return Err(Error::DeviceList(DeviceListError::DeviceAlreadyExists));
        }
        device_ids.push(new_device.device_id.clone());

        // Put new device
        let put_device = Put::builder()
          .table_name(devices_table::NAME)
          .set_item(Some(new_device.into()))
          .condition_expression(
            "attribute_not_exists(#user_id) AND attribute_not_exists(#item_id)",
          )
          .expression_attribute_names("#user_id", ATTR_USER_ID)
          .expression_attribute_names("#item_id", ATTR_ITEM_ID)
          .build();
        let put_device_operation =
          TransactWriteItem::builder().put(put_device).build();

        Ok(put_device_operation)
      })
      .await
  }

  /// Removes device from user's device list. If the device doesn't exist, the
  /// operation fails. Transactionally generates new device list version.
  pub async fn remove_device(
    &self,
    user_id: impl Into<String>,
    device_id: impl AsRef<str>,
  ) -> Result<(), Error> {
    let user_id: String = user_id.into();
    let device_id = device_id.as_ref();
    self
      .transact_update_devicelist(&user_id, |ref mut device_ids| {
        let device_exists = device_ids.iter().any(|id| id == device_id);
        if !device_exists {
          warn!(
            "Device doesn't exist in user's device list \
          (userID={}, deviceID={})",
            &user_id, device_id
          );
          return Err(Error::DeviceList(DeviceListError::DeviceNotFound));
        }

        device_ids.retain(|id| id != device_id);

        // Delete device DDB operation
        let delete_device = Delete::builder()
          .table_name(devices_table::NAME)
          .key(ATTR_USER_ID, AttributeValue::S(user_id.clone()))
          .key(
            ATTR_ITEM_ID,
            DeviceIDAttribute(device_id.to_string()).into(),
          )
          .condition_expression(
            "attribute_exists(#user_id) AND attribute_exists(#item_id)",
          )
          .expression_attribute_names("#user_id", ATTR_USER_ID)
          .expression_attribute_names("#item_id", ATTR_ITEM_ID)
          .build();
        let operation =
          TransactWriteItem::builder().delete(delete_device).build();

        Ok(operation)
      })
      .await
  }

  /// Performs a transactional update of the device list for the user. Afterwards
  /// generates a new device list and updates the timestamp in the users table.
  /// This is done in a transaction. Operation fails if the device list has been
  /// updated concurrently (timestamp mismatch).
  async fn transact_update_devicelist(
    &self,
    user_id: &str,
    // The closure performing a transactional update of the device list. It receives a mutable
    // reference to the current device list. The closure should return a transactional DDB
    // operation to be performed when updating the device list.
    action: impl FnOnce(&mut Vec<String>) -> Result<TransactWriteItem, Error>,
  ) -> Result<(), Error> {
    let previous_timestamp =
      get_current_devicelist_timestamp(self, user_id).await?;
    let mut device_ids = self
      .get_current_device_list(user_id)
      .await?
      .map(|device_list| device_list.device_ids)
      .unwrap_or_default();

    // Perform the update action, then generate new device list
    let operation = action(&mut device_ids)?;
    let new_device_list = DeviceListRow::new(user_id, device_ids);

    // Update timestamp in users table
    let timestamp_update_operation = device_list_timestamp_update_operation(
      user_id,
      previous_timestamp,
      new_device_list.timestamp,
    );

    // Put updated device list (a new version)
    let put_device_list = Put::builder()
      .table_name(devices_table::NAME)
      .set_item(Some(new_device_list.into()))
      .condition_expression(
        "attribute_not_exists(#user_id) AND attribute_not_exists(#item_id)",
      )
      .expression_attribute_names("#user_id", ATTR_USER_ID)
      .expression_attribute_names("#item_id", ATTR_ITEM_ID)
      .build();
    let put_device_list_operation =
      TransactWriteItem::builder().put(put_device_list).build();

    self
      .client
      .transact_write_items()
      .transact_items(operation)
      .transact_items(put_device_list_operation)
      .transact_items(timestamp_update_operation)
      .send()
      .await
      .map_err(|e| match DynamoDBError::from(e) {
        DynamoDBError::TransactionCanceledException(
          TransactionCanceledException {
            cancellation_reasons: Some(reasons),
            ..
          },
        ) if reasons
          .iter()
          .any(|reason| reason.code() == Some("ConditionalCheckFailed")) =>
        {
          Error::DeviceList(DeviceListError::ConcurrentUpdateError)
        }
        other => {
          error!("Device list update transaction failed: {:?}", other);
          Error::AwsSdk(other)
        }
      })?;

    Ok(())
  }

  /// Deletes all user data from devices table
  pub async fn delete_devices_table_rows_for_user(
    &self,
    user_id: impl Into<String>,
  ) -> Result<(), Error> {
    // 1. get all rows
    // 2. batch write delete all

    // we project only the primary keys so we can pass these directly to delete requests
    let primary_keys = self
      .client
      .query()
      .table_name(devices_table::NAME)
      .projection_expression("#user_id, #item_id")
      .key_condition_expression("#user_id = :user_id")
      .expression_attribute_names("#user_id", ATTR_USER_ID)
      .expression_attribute_names("#item_id", ATTR_ITEM_ID)
      .expression_attribute_values(
        ":user_id",
        AttributeValue::S(user_id.into()),
      )
      .consistent_read(true)
      .send()
      .await
      .map_err(|e| {
        error!("Failed to list user's items in devices table: {:?}", e);
        Error::AwsSdk(e.into())
      })?
      .items
      .unwrap_or_default();

    let delete_requests = primary_keys
      .into_iter()
      .map(|item| {
        let request = DeleteRequest::builder().set_key(Some(item)).build();
        WriteRequest::builder().delete_request(request).build()
      })
      .collect::<Vec<_>>();

    // TODO: We can use the batch write helper from comm-services-lib when integrated
    for batch in delete_requests.chunks(25) {
      self
        .client
        .batch_write_item()
        .request_items(devices_table::NAME, batch.to_vec())
        .send()
        .await
        .map_err(|e| {
          error!("Failed to batch delete items from devices table: {:?}", e);
          Error::AwsSdk(e.into())
        })?;
    }

    Ok(())
  }
}

/// Gets timestamp of user's current device list. Returns None if the user
/// doesn't have a device list yet. Storing the timestamp in the users table is
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

  let timestamp = DateTime::<Utc>::try_from_attr(
    USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME,
    raw_datetime,
  )?;
  Ok(Some(timestamp))
}

/// Generates update expression for current device list timestamp in users table.
/// The previous timestamp is used as a condition to ensure that the value hasn't changed
/// since we got it. This avoids race conditions when updating the device list.
fn device_list_timestamp_update_operation(
  user_id: impl Into<String>,
  previous_timestamp: Option<DateTime<Utc>>,
  new_timestamp: DateTime<Utc>,
) -> TransactWriteItem {
  let update_builder = match previous_timestamp {
    Some(previous_timestamp) => Update::builder()
      .condition_expression("#device_list_timestamp = :previous_timestamp")
      .expression_attribute_values(
        ":previous_timestamp",
        AttributeValue::S(previous_timestamp.to_rfc3339()),
      ),
    // If there's no previous timestamp, the attribute shouldn't exist yet
    None => Update::builder()
      .condition_expression("attribute_not_exists(#device_list_timestamp)"),
  };

  let update = update_builder
    .table_name(USERS_TABLE)
    .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id.into()))
    .update_expression("SET #device_list_timestamp = :new_timestamp")
    .expression_attribute_names(
      "#device_list_timestamp",
      USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME,
    )
    .expression_attribute_values(
      ":new_timestamp",
      AttributeValue::S(new_timestamp.to_rfc3339()),
    )
    .build();

  TransactWriteItem::builder().update(update).build()
}

/// Helper function to query rows by given sort key prefix
fn query_rows_with_prefix(
  db: &crate::database::DatabaseClient,
  user_id: impl Into<String>,
  prefix: &'static str,
) -> QueryFluentBuilder {
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
    .consistent_read(true)
}
