use std::collections::{HashMap, HashSet};

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
use tracing::{debug, error, warn};

use crate::{
  client_service::FlattenedDeviceKeyUpload,
  constants::{
    devices_table::{self, *},
    USERS_TABLE, USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME,
    USERS_TABLE_PARTITION_KEY,
  },
  error::{DeviceListError, Error},
  grpc_services::protos::{self, unauth::DeviceType},
  grpc_utils::DeviceKeysInfo,
};

use super::DatabaseClient;

// We omit the content and notif one-time key count attributes from this struct
// because they are internal helpers and are not provided by users
#[derive(Clone, Debug)]
pub struct DeviceRow {
  pub user_id: String,
  pub device_id: String,
  pub device_type: DeviceType,
  pub device_key_info: IdentityKeyInfo,
  pub content_prekey: Prekey,
  pub notif_prekey: Prekey,

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
}

#[derive(Clone, Debug)]
pub struct Prekey {
  pub prekey: String,
  pub prekey_signature: String,
}

/// A struct representing device list update request
/// payload; issued by the primary device
#[derive(derive_more::Constructor)]
pub struct DeviceListUpdate {
  pub devices: Vec<String>,
  pub timestamp: DateTime<Utc>,
}

impl DeviceRow {
  pub fn from_device_key_upload(
    user_id: impl Into<String>,
    upload: FlattenedDeviceKeyUpload,
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
      },
      content_prekey: Prekey {
        prekey: upload.content_prekey,
        prekey_signature: upload.content_prekey_signature,
      },
      notif_prekey: Prekey {
        prekey: upload.notif_prekey,
        prekey_signature: upload.notif_prekey_signature,
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
pub struct DeviceIDAttribute(pub String);
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
      .take_attr::<AttributeMap>(ATTR_DEVICE_KEY_INFO)
      .and_then(IdentityKeyInfo::try_from)?;

    let content_prekey = attrs
      .take_attr::<AttributeMap>(ATTR_CONTENT_PREKEY)
      .and_then(Prekey::try_from)?;

    let notif_prekey = attrs
      .take_attr::<AttributeMap>(ATTR_NOTIF_PREKEY)
      .and_then(Prekey::try_from)?;

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

impl From<IdentityKeyInfo> for protos::unauth::IdentityKeyInfo {
  fn from(value: IdentityKeyInfo) -> Self {
    Self {
      payload: value.key_payload,
      payload_signature: value.key_payload_signature,
    }
  }
}

impl From<IdentityKeyInfo> for AttributeValue {
  fn from(value: IdentityKeyInfo) -> Self {
    let attrs = HashMap::from([
      (
        ATTR_KEY_PAYLOAD.to_string(),
        AttributeValue::S(value.key_payload),
      ),
      (
        ATTR_KEY_PAYLOAD_SIGNATURE.to_string(),
        AttributeValue::S(value.key_payload_signature),
      ),
    ]);
    AttributeValue::M(attrs)
  }
}

impl TryFrom<AttributeMap> for IdentityKeyInfo {
  type Error = DBItemError;
  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let key_payload = attrs.take_attr(ATTR_KEY_PAYLOAD)?;
    let key_payload_signature = attrs.take_attr(ATTR_KEY_PAYLOAD_SIGNATURE)?;

    Ok(Self {
      key_payload,
      key_payload_signature,
    })
  }
}

impl From<Prekey> for AttributeValue {
  fn from(value: Prekey) -> Self {
    let attrs = HashMap::from([
      (ATTR_PREKEY.to_string(), AttributeValue::S(value.prekey)),
      (
        ATTR_PREKEY_SIGNATURE.to_string(),
        AttributeValue::S(value.prekey_signature),
      ),
    ]);
    AttributeValue::M(attrs)
  }
}

impl From<Prekey> for protos::unauth::Prekey {
  fn from(value: Prekey) -> Self {
    Self {
      prekey: value.prekey,
      prekey_signature: value.prekey_signature,
    }
  }
}

impl From<protos::unauth::Prekey> for Prekey {
  fn from(value: protos::unauth::Prekey) -> Self {
    Self {
      prekey: value.prekey,
      prekey_signature: value.prekey_signature,
    }
  }
}

impl TryFrom<AttributeMap> for Prekey {
  type Error = DBItemError;
  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let prekey = attrs.take_attr(ATTR_PREKEY)?;
    let prekey_signature = attrs.take_attr(ATTR_PREKEY_SIGNATURE)?;
    Ok(Self {
      prekey,
      prekey_signature,
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
    let user_devices_keys = user_devices
      .into_iter()
      .map(|device| (device.device_id.clone(), DeviceKeysInfo::from(device)))
      .collect();
    Ok(user_devices_keys)
  }

  pub async fn update_device_prekeys(
    &self,
    user_id: impl Into<String>,
    device_id: impl Into<String>,
    content_prekey: Prekey,
    notif_prekey: Prekey,
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

  pub async fn get_device_data(
    &self,
    user_id: impl Into<String>,
    device_id: impl Into<String>,
  ) -> Result<Option<DeviceRow>, Error> {
    let GetItemOutput { item, .. } = self
      .client
      .get_item()
      .table_name(devices_table::NAME)
      .key(ATTR_USER_ID, AttributeValue::S(user_id.into()))
      .key(ATTR_ITEM_ID, DeviceIDAttribute(device_id.into()).into())
      .send()
      .await
      .map_err(|e| {
        error!("Failed to fetch device data: {:?}", e);
        Error::AwsSdk(e.into())
      })?;

    let Some(attrs) = item else {
      return Ok(None);
    };

    let device_data = DeviceRow::try_from(attrs)?;
    Ok(Some(device_data))
  }

  /// Fails if the device list is empty
  pub async fn get_primary_device_data(
    &self,
    user_id: &str,
  ) -> Result<DeviceRow, Error> {
    let device_list = self.get_current_device_list(user_id).await?;
    let Some(primary_device_id) = device_list
      .as_ref()
      .and_then(|list| list.device_ids.first())
    else {
      error!(user_id, "Device list is empty. Cannot fetch primary device");
      return Err(Error::DeviceList(DeviceListError::DeviceNotFound));
    };

    self
      .get_device_data(user_id, primary_device_id)
      .await?
      .ok_or_else(|| {
        error!(
          "Corrupt database. Missing primary device data for user {}",
          user_id
        );
        Error::MissingItem
      })
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

  /// Adds device data to devices table. If the device already exists, its
  /// data is overwritten. This does not update the device list; the device ID
  /// should already be present in the device list.
  pub async fn put_device_data(
    &self,
    user_id: impl Into<String>,
    device_key_upload: FlattenedDeviceKeyUpload,
    code_version: u64,
    login_time: DateTime<Utc>,
  ) -> Result<(), Error> {
    let content_one_time_keys = device_key_upload.content_one_time_keys.clone();
    let notif_one_time_keys = device_key_upload.notif_one_time_keys.clone();
    let user_id_string = user_id.into();
    let new_device = DeviceRow::from_device_key_upload(
      user_id_string.clone(),
      device_key_upload,
      code_version,
      login_time,
    );
    let device_id = new_device.device_id.clone();

    self
      .client
      .put_item()
      .table_name(devices_table::NAME)
      .set_item(Some(new_device.into()))
      .send()
      .await
      .map_err(|e| {
        error!("Failed to put device data: {:?}", e);
        Error::AwsSdk(e.into())
      })?;

    self
      .append_one_time_prekeys(
        &user_id_string,
        &device_id,
        &content_one_time_keys,
        &notif_one_time_keys,
      )
      .await?;

    Ok(())
  }

  /// Adds new device to user's device list. If the device already exists, the
  /// operation fails. Transactionally generates new device list version.
  pub async fn add_device(
    &self,
    user_id: impl Into<String>,
    device_key_upload: FlattenedDeviceKeyUpload,
    code_version: u64,
    login_time: DateTime<Utc>,
  ) -> Result<(), Error> {
    let user_id: String = user_id.into();
    self
      .transact_update_devicelist(&user_id, |device_ids, mut devices_data| {
        let new_device = DeviceRow::from_device_key_upload(
          &user_id,
          device_key_upload,
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

        // Reorder devices (determine primary device again)
        devices_data.push(new_device.clone());
        migration::reorder_device_list(&user_id, device_ids, &devices_data);

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

        Ok(Some(put_device_operation))
      })
      .await?;

    Ok(())
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
      .transact_update_devicelist(&user_id, |device_ids, mut devices_data| {
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

        // Reorder devices (determine primary device again)
        devices_data.retain(|d| d.device_id != device_id);
        migration::reorder_device_list(&user_id, device_ids, &devices_data);

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

        Ok(Some(operation))
      })
      .await?;

    Ok(())
  }

  /// applies updated device list received from primary device
  pub async fn apply_devicelist_update(
    &self,
    user_id: &str,
    update: DeviceListUpdate,
  ) -> Result<DeviceListRow, Error> {
    let DeviceListUpdate {
      devices: new_list, ..
    } = update;
    self
      .transact_update_devicelist(user_id, |current_list, _| {
        // TODO: Add proper validation according to the whitepaper
        // currently only adding new device is supported (new.len - old.len = 1)

        let new_set: HashSet<_> = new_list.iter().collect();
        let current_set: HashSet<_> = current_list.iter().collect();
        // difference is A - B (only new devices)
        let difference: HashSet<_> = new_set.difference(&current_set).collect();
        if difference.len() != 1 {
          warn!("Received invalid device list update");
          return Err(Error::DeviceList(
            DeviceListError::InvalidDeviceListUpdate,
          ));
        }

        debug!("Applying device list update. Difference: {:?}", difference);
        *current_list = new_list;

        Ok(None)
      })
      .await
  }

  /// Performs a transactional update of the device list for the user. Afterwards
  /// generates a new device list and updates the timestamp in the users table.
  /// This is done in a transaction. Operation fails if the device list has been
  /// updated concurrently (timestamp mismatch).
  /// Returns the new device list row that has been saved to database.
  async fn transact_update_devicelist(
    &self,
    user_id: &str,
    // The closure performing a transactional update of the device list.
    // It receives two arguments:
    // 1. A mutable reference to the current device list (ordered device IDs).
    // 2. Details (full data) of the current devices (unordered).
    // The closure should return a transactional DDB
    // operation to be performed when updating the device list.
    action: impl FnOnce(
      &mut Vec<String>,
      Vec<DeviceRow>,
    ) -> Result<Option<TransactWriteItem>, Error>,
  ) -> Result<DeviceListRow, Error> {
    let previous_timestamp =
      get_current_devicelist_timestamp(self, user_id).await?;
    let current_devices_data = self.get_current_devices(user_id).await?;
    let mut device_ids = self
      .get_current_device_list(user_id)
      .await?
      .map(|device_list| device_list.device_ids)
      .unwrap_or_default();

    // Perform the update action, then generate new device list
    let operation = action(&mut device_ids, current_devices_data)?;
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
      .set_item(Some(new_device_list.clone().into()))
      .condition_expression(
        "attribute_not_exists(#user_id) AND attribute_not_exists(#item_id)",
      )
      .expression_attribute_names("#user_id", ATTR_USER_ID)
      .expression_attribute_names("#item_id", ATTR_ITEM_ID)
      .build();
    let put_device_list_operation =
      TransactWriteItem::builder().put(put_device_list).build();

    let operations = if let Some(operation) = operation {
      vec![
        operation,
        put_device_list_operation,
        timestamp_update_operation,
      ]
    } else {
      vec![put_device_list_operation, timestamp_update_operation]
    };

    self
      .client
      .transact_write_items()
      .set_transact_items(Some(operations))
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

    Ok(new_device_list)
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

// Helper module for "migration" code into new device list schema.
// We can get rid of this when primary device takes over the responsibility
// of managing the device list.
mod migration {
  use std::{cmp::Ordering, collections::HashSet};
  use tracing::{debug, error, info};

  use super::*;

  pub(super) fn reorder_device_list(
    user_id: &str,
    list: &mut [String],
    devices_data: &[DeviceRow],
  ) {
    if !verify_device_list_match(list, devices_data) {
      error!("Found corrupt device list for user (userID={})!", user_id);
      return;
    }

    let Some(first_device) = list.first() else {
      debug!("Skipping device list rotation. Nothing to reorder.");
      return;
    };
    let Some(primary_device) = determine_primary_device(devices_data) else {
      info!(
        "No valid primary device found for user (userID={}).\
        Skipping device list reorder.",
        user_id
      );
      return;
    };

    if first_device == &primary_device.device_id {
      debug!("Skipping device list reorder. Primary device is already first");
      return;
    }

    // swap primary device with the first one
    let Some(primary_device_idx) =
      list.iter().position(|id| id == &primary_device.device_id)
    else {
      error!(
        "Primary device not found in device list (userID={})",
        user_id
      );
      return;
    };
    list.swap(0, primary_device_idx);
    info!("Reordered device list for user (userID={})", user_id);
  }

  // checks if device list matches given devices data
  fn verify_device_list_match(
    list: &[String],
    devices_data: &[DeviceRow],
  ) -> bool {
    if list.len() != devices_data.len() {
      error!("Device list length mismatch!");
      return false;
    }

    let actual_device_ids = devices_data
      .iter()
      .map(|device| &device.device_id)
      .collect::<HashSet<_>>();

    let device_list_set = list.iter().collect::<HashSet<_>>();

    if let Some(corrupt_device_id) = device_list_set
      .symmetric_difference(&actual_device_ids)
      .next()
    {
      error!(
        "Device list is corrupt (unknown deviceID={})",
        corrupt_device_id
      );
      return false;
    }

    true
  }

  /// Returns reference to primary device (if any) from given list of devices
  /// or None if there's no valid primary device.
  fn determine_primary_device(devices: &[DeviceRow]) -> Option<&DeviceRow> {
    // 1. Find mobile devices with valid token
    // 2. Prioritize these with latest code version
    // 3. If there's a tie, select the one with latest login time

    let mut mobile_devices = devices
      .iter()
      .filter(|device| {
        device.device_type == DeviceType::Ios
          || device.device_type == DeviceType::Android
      })
      .collect::<Vec<_>>();

    mobile_devices.sort_by(|a, b| {
      let code_version_cmp = b.code_version.cmp(&a.code_version);
      if code_version_cmp == Ordering::Equal {
        b.login_time.cmp(&a.login_time)
      } else {
        code_version_cmp
      }
    });
    mobile_devices.first().cloned()
  }

  #[cfg(test)]
  mod tests {
    use super::*;
    use chrono::Duration;

    #[test]
    fn reorder_skips_no_devices() {
      let mut list = vec![];
      reorder_device_list("", &mut list, &[]);
      assert_eq!(list, Vec::<String>::new());
    }

    #[test]
    fn reorder_skips_single_device() {
      let mut list = vec!["test".into()];
      let devices_data =
        vec![create_test_device("test", DeviceType::Web, 0, Utc::now())];

      reorder_device_list("", &mut list, &devices_data);
      assert_eq!(list, vec!["test"]);
    }

    #[test]
    fn reorder_skips_for_valid_list() {
      let mut list = vec!["mobile".into(), "web".into()];
      let devices_data = vec![
        create_test_device("mobile", DeviceType::Android, 1, Utc::now()),
        create_test_device("web", DeviceType::Web, 0, Utc::now()),
      ];

      reorder_device_list("", &mut list, &devices_data);
      assert_eq!(list, vec!["mobile", "web"]);
    }

    #[test]
    fn reorder_swaps_primary_device_when_possible() {
      let mut list = vec!["web".into(), "mobile".into()];
      let devices_data = vec![
        create_test_device("web", DeviceType::Web, 0, Utc::now()),
        create_test_device("mobile", DeviceType::Android, 1, Utc::now()),
      ];

      reorder_device_list("", &mut list, &devices_data);
      assert_eq!(list, vec!["mobile", "web"]);
    }

    #[test]
    fn determine_primary_device_returns_none_for_empty_list() {
      let devices = vec![];
      assert!(determine_primary_device(&devices).is_none());
    }

    #[test]
    fn determine_primary_device_returns_none_for_web_only() {
      let devices =
        vec![create_test_device("web", DeviceType::Web, 0, Utc::now())];

      assert!(
        determine_primary_device(&devices).is_none(),
        "Primary device should be None for web-only devices"
      );
    }

    #[test]
    fn determine_primary_device_prioritizes_mobile() {
      let devices = vec![
        create_test_device("mobile", DeviceType::Android, 0, Utc::now()),
        create_test_device("web", DeviceType::Web, 0, Utc::now()),
      ];

      let primary_device = determine_primary_device(&devices)
        .expect("Primary device should be present");
      assert_eq!(
        primary_device.device_id, "mobile",
        "Primary device should be mobile"
      );
    }

    #[test]
    fn determine_primary_device_prioritizes_latest_code_version() {
      let devices_with_latest_code_version = vec![
        create_test_device("mobile1", DeviceType::Android, 1, Utc::now()),
        create_test_device("mobile2", DeviceType::Android, 2, Utc::now()),
        create_test_device("web", DeviceType::Web, 0, Utc::now()),
      ];

      let primary_device =
        determine_primary_device(&devices_with_latest_code_version)
          .expect("Primary device should be present");

      assert_eq!(
        primary_device.device_id, "mobile2",
        "Primary device should be mobile with latest code version"
      );
    }

    #[test]
    fn determine_primary_device_prioritizes_latest_login_time() {
      let devices = vec![
        create_test_device("mobile1_today", DeviceType::Ios, 1, Utc::now()),
        create_test_device(
          "mobile2_yesterday",
          DeviceType::Android,
          1,
          Utc::now() - Duration::days(1),
        ),
        create_test_device("web", DeviceType::Web, 0, Utc::now()),
      ];

      let primary_device = determine_primary_device(&devices)
        .expect("Primary device should be present");

      assert_eq!(
        primary_device.device_id, "mobile1_today",
        "Primary device should be mobile with latest login time"
      );
    }

    #[test]
    fn determine_primary_device_keeps_deterministic_order() {
      // Given two identical devices, the first one should be selected as primary
      let today = Utc::now();
      let devices_with_latest_code_version = vec![
        create_test_device("mobile1", DeviceType::Android, 1, today),
        create_test_device("mobile2", DeviceType::Android, 1, today),
      ];

      let primary_device =
        determine_primary_device(&devices_with_latest_code_version)
          .expect("Primary device should be present");

      assert_eq!(
        primary_device.device_id, "mobile1",
        "Primary device selection should be deterministic"
      );
    }

    #[test]
    fn determine_primary_device_all_rules_together() {
      use DeviceType::{Android, Ios, Web};
      let today = Utc::now();
      let yesterday = today - Duration::days(1);

      let devices = vec![
        create_test_device("mobile1_today", Android, 1, today),
        create_test_device("mobile2_today", Android, 2, today),
        create_test_device("mobile3_yesterday", Ios, 1, yesterday),
        create_test_device("mobile4_yesterday", Ios, 2, yesterday),
        create_test_device("web", Web, 5, today),
      ];

      let primary_device = determine_primary_device(&devices)
        .expect("Primary device should be present");

      assert_eq!(
        primary_device.device_id, "mobile2_today",
        "Primary device should be mobile with latest code version and login time"
    );
    }

    fn create_test_device(
      id: &str,
      platform: DeviceType,
      code_version: u64,
      login_time: DateTime<Utc>,
    ) -> DeviceRow {
      DeviceRow {
        user_id: "test".into(),
        device_id: id.into(),
        device_type: platform,
        device_key_info: IdentityKeyInfo {
          key_payload: "".into(),
          key_payload_signature: "".into(),
        },
        content_prekey: Prekey {
          prekey: "".into(),
          prekey_signature: "".into(),
        },
        notif_prekey: Prekey {
          prekey: "".into(),
          prekey_signature: "".into(),
        },
        code_version,
        login_time,
      }
    }
  }
}
