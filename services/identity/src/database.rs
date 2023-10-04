use constant_time_eq::constant_time_eq;
use std::collections::{HashMap, HashSet};
use std::fmt::{Display, Formatter, Result as FmtResult};
use std::str::FromStr;
use std::sync::Arc;

use crate::ddb_utils::{
  create_one_time_key_partition_key, into_one_time_put_requests, OlmAccountType,
};
use crate::error::{consume_error, DBItemAttributeError, DBItemError, Error};
use aws_config::SdkConfig;
use aws_sdk_dynamodb::model::{AttributeValue, PutRequest, WriteRequest};
use aws_sdk_dynamodb::output::{
  DeleteItemOutput, GetItemOutput, PutItemOutput, QueryOutput,
};
use aws_sdk_dynamodb::{types::Blob, Client};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

use crate::client_service::{FlattenedDeviceKeyUpload, UserRegistrationInfo};
use crate::config::CONFIG;
use crate::constants::{
  ACCESS_TOKEN_SORT_KEY, ACCESS_TOKEN_TABLE,
  ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE, ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_PARTITION_KEY, ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE, CONTENT_ONE_TIME_KEY, NONCE_TABLE,
  NONCE_TABLE_CREATED_ATTRIBUTE, NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE,
  NONCE_TABLE_EXPIRATION_TIME_UNIX_ATTRIBUTE, NONCE_TABLE_PARTITION_KEY,
  NOTIF_ONE_TIME_KEY, RESERVED_USERNAMES_TABLE,
  RESERVED_USERNAMES_TABLE_PARTITION_KEY, USERS_TABLE,
  USERS_TABLE_DEVICES_ATTRIBUTE,
  USERS_TABLE_DEVICES_MAP_CONTENT_ONE_TIME_KEYS_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_NOTIF_ONE_TIME_KEYS_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME,
  USERS_TABLE_PARTITION_KEY, USERS_TABLE_REGISTRATION_ATTRIBUTE,
  USERS_TABLE_USERNAME_ATTRIBUTE, USERS_TABLE_USERNAME_INDEX,
  USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE, USERS_TABLE_WALLET_ADDRESS_INDEX,
};
use crate::error::{AttributeValueFromHashMap, FromAttributeValue};
use crate::id::generate_uuid;
use crate::nonce::NonceData;
use crate::token::{AccessTokenData, AuthType};

#[derive(Serialize, Deserialize)]
pub struct OlmKeys {
  pub curve25519: String,
  pub ed25519: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyPayload {
  pub notification_identity_public_keys: OlmKeys,
  pub primary_identity_public_keys: OlmKeys,
}

impl FromStr for KeyPayload {
  type Err = serde_json::Error;

  // The payload is held in the database as an escaped JSON payload.
  // Escaped double quotes need to be trimmed before attempting to serialize
  fn from_str(payload: &str) -> Result<KeyPayload, Self::Err> {
    serde_json::from_str(&payload.replace(r#"\""#, r#"""#))
  }
}

#[derive(Clone, Copy)]
#[allow(non_camel_case_types)]
pub enum Device {
  // Numeric values should match the protobuf definition
  Keyserver = 0,
  Web,
  Ios,
  Android,
  Windows,
  MacOS,
}

impl TryFrom<i32> for Device {
  type Error = crate::error::Error;

  fn try_from(value: i32) -> Result<Self, Self::Error> {
    match value {
      0 => Ok(Device::Keyserver),
      1 => Ok(Device::Web),
      2 => Ok(Device::Ios),
      3 => Ok(Device::Android),
      4 => Ok(Device::Windows),
      5 => Ok(Device::MacOS),
      _ => Err(Error::Attribute(DBItemError {
        attribute_name: USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME
          .to_string(),
        attribute_value: Some(AttributeValue::N(value.to_string())),
        attribute_error: DBItemAttributeError::InvalidValue,
      })),
    }
  }
}

impl Display for Device {
  fn fmt(&self, f: &mut Formatter) -> FmtResult {
    match self {
      Device::Keyserver => write!(f, "keyserver"),
      Device::Web => write!(f, "web"),
      Device::Ios => write!(f, "ios"),
      Device::Android => write!(f, "android"),
      Device::Windows => write!(f, "windows"),
      Device::MacOS => write!(f, "macos"),
    }
  }
}

// This is very similar to the protobuf definitions, however,
// coupling the protobuf schema to the database API should be avoided.
pub struct PreKey {
  pub prekey: String,
  pub prekey_signature: String,
}
pub struct OutboundKeys {
  pub key_payload: String,
  pub key_payload_signature: String,
  pub social_proof: Option<String>,
  pub content_prekey: PreKey,
  pub notif_prekey: PreKey,
  pub content_one_time_key: Option<String>,
  pub notif_one_time_key: Option<String>,
}

#[derive(Clone)]
pub struct DatabaseClient {
  client: Arc<Client>,
}

impl DatabaseClient {
  pub fn new(aws_config: &SdkConfig) -> Self {
    let client = match &CONFIG.localstack_endpoint {
      Some(endpoint) => {
        info!(
          "Configuring DynamoDB client to use LocalStack endpoint: {}",
          endpoint
        );
        let ddb_config_builder =
          aws_sdk_dynamodb::config::Builder::from(aws_config)
            .endpoint_url(endpoint);
        Client::from_conf(ddb_config_builder.build())
      }
      None => Client::new(aws_config),
    };

    DatabaseClient {
      client: Arc::new(client),
    }
  }

  pub async fn add_password_user_to_users_table(
    &self,
    registration_state: UserRegistrationInfo,
    password_file: Vec<u8>,
  ) -> Result<String, Error> {
    self
      .add_user_to_users_table(
        registration_state.flattened_device_key_upload,
        Some((registration_state.username, Blob::new(password_file))),
        None,
        None,
      )
      .await
  }

  pub async fn add_wallet_user_to_users_table(
    &self,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
    wallet_address: String,
    social_proof: String,
  ) -> Result<String, Error> {
    self
      .add_user_to_users_table(
        flattened_device_key_upload,
        None,
        Some(wallet_address),
        Some(social_proof),
      )
      .await
  }

  async fn add_user_to_users_table(
    &self,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
    username_and_password_file: Option<(String, Blob)>,
    wallet_address: Option<String>,
    social_proof: Option<String>,
  ) -> Result<String, Error> {
    let user_id = generate_uuid();
    let device_info =
      create_device_info(flattened_device_key_upload.clone(), social_proof);
    let devices = HashMap::from([(
      flattened_device_key_upload.device_id_key.clone(),
      AttributeValue::M(device_info),
    )]);
    let mut user = HashMap::from([
      (
        USERS_TABLE_PARTITION_KEY.to_string(),
        AttributeValue::S(user_id.clone()),
      ),
      (
        USERS_TABLE_DEVICES_ATTRIBUTE.to_string(),
        AttributeValue::M(devices),
      ),
    ]);

    if let Some((username, password_file)) = username_and_password_file {
      user.insert(
        USERS_TABLE_USERNAME_ATTRIBUTE.to_string(),
        AttributeValue::S(username),
      );
      user.insert(
        USERS_TABLE_REGISTRATION_ATTRIBUTE.to_string(),
        AttributeValue::B(password_file),
      );
    }

    if let Some(address) = wallet_address {
      user.insert(
        USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE.to_string(),
        AttributeValue::S(address),
      );
    }

    self
      .client
      .put_item()
      .table_name(USERS_TABLE)
      .set_item(Some(user))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    self
      .append_one_time_prekeys(
        flattened_device_key_upload.device_id_key,
        flattened_device_key_upload.content_one_time_keys,
        flattened_device_key_upload.notif_one_time_keys,
      )
      .await?;

    Ok(user_id)
  }

  pub async fn add_password_user_device_to_users_table(
    &self,
    user_id: String,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
  ) -> Result<(), Error> {
    self
      .add_device_to_users_table(user_id, flattened_device_key_upload, None)
      .await
  }

  pub async fn add_wallet_user_device_to_users_table(
    &self,
    user_id: String,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
    social_proof: String,
  ) -> Result<(), Error> {
    self
      .add_device_to_users_table(
        user_id,
        flattened_device_key_upload,
        Some(social_proof),
      )
      .await
  }

  pub async fn get_keyserver_keys_for_user(
    &self,
    user_id: &str,
  ) -> Result<Option<OutboundKeys>, Error> {
    // DynamoDB doesn't have a way to "pop" a value from a list, so we must
    // first read in user info, then update one_time_keys with value we
    // gave to requester
    let user_info = self
      .get_item_from_users_table(user_id)
      .await?
      .item
      .ok_or(Error::MissingItem)?;

    let devices = user_info
      .get(USERS_TABLE_DEVICES_ATTRIBUTE)
      .ok_or(Error::MissingItem)?
      .to_hashmap(USERS_TABLE_DEVICES_ATTRIBUTE)?;

    let mut maybe_keyserver_id = None;
    for (device_id, device_info) in devices {
      let device_type = device_info
        .to_hashmap("device_id")?
        .get(USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME)
        .ok_or(Error::MissingItem)?
        .to_string(USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME)?;

      if device_type == "keyserver" {
        maybe_keyserver_id = Some(device_id);
        break;
      }
    }

    // Assert that the user has a keyserver, if they don't return None
    let keyserver_id = match maybe_keyserver_id {
      None => return Ok(None),
      Some(id) => id,
    };

    let keyserver = devices.get_map(keyserver_id)?;
    let notif_one_time_key: Option<String> = self
      .get_one_time_key(keyserver_id, OlmAccountType::Notification)
      .await?;
    let content_one_time_key: Option<String> = self
      .get_one_time_key(keyserver_id, OlmAccountType::Content)
      .await?;

    debug!(
      "Able to get notif one-time key for keyserver {}: {}",
      keyserver_id,
      notif_one_time_key.is_some()
    );
    debug!(
      "Able to get content one-time key for keyserver {}: {}",
      keyserver_id,
      content_one_time_key.is_some()
    );

    let content_prekey = keyserver
      .get_string(USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME)?;
    let content_prekey_signature = keyserver.get_string(
      USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
    )?;
    let notif_prekey = keyserver
      .get_string(USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME)?;
    let notif_prekey_signature = keyserver.get_string(
      USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
    )?;
    let key_payload = keyserver
      .get_string(USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME)?
      .to_string();
    let key_payload_signature = keyserver
      .get_string(USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME)?
      .to_string();
    let social_proof = keyserver
      .get(USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME)
      .and_then(|s| {
        s.to_string(USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME)
          .ok()
      })
      .map(|s| s.to_owned());

    let full_content_prekey = PreKey {
      prekey: content_prekey.to_string(),
      prekey_signature: content_prekey_signature.to_string(),
    };

    let full_notif_prekey = PreKey {
      prekey: notif_prekey.to_string(),
      prekey_signature: notif_prekey_signature.to_string(),
    };

    let outbound_payload = OutboundKeys {
      key_payload,
      key_payload_signature,
      social_proof,
      content_prekey: full_content_prekey,
      notif_prekey: full_notif_prekey,
      content_one_time_key,
      notif_one_time_key,
    };

    Ok(Some(outbound_payload))
  }

  /// Will "mint" a single one-time key by attempting to successfully delete a
  /// key
  pub async fn get_one_time_key(
    &self,
    device_id: &str,
    account_type: OlmAccountType,
  ) -> Result<Option<String>, Error> {
    use crate::constants::one_time_keys_table as otk_table;
    use crate::constants::ONE_TIME_KEY_MINIMUM_THRESHOLD;

    let query_result = self.get_one_time_keys(device_id, account_type).await?;
    let items = query_result.items();

    fn spawn_refresh_keys_task(device_id: &str) {
      // Clone the string slice to move into the async block
      let device_id = device_id.to_string();
      tokio::spawn(async move {
        debug!("Attempting to request more keys for device: {}", &device_id);
        let result =
          crate::tunnelbroker::send_refresh_keys_request(&device_id).await;
        consume_error(result);
      });
    }

    // If no one-time keys exist, or if there aren't enough, request more.
    // Additionally, if no one-time keys exist, return early.
    let item_vec = if let Some(items_list) = items {
      if items_list.len() < ONE_TIME_KEY_MINIMUM_THRESHOLD {
        spawn_refresh_keys_task(device_id);
      }
      items_list
    } else {
      debug!("Unable to find {:?} one-time key", account_type);
      spawn_refresh_keys_task(device_id);
      return Ok(None);
    };

    let mut result = None;
    // Attempt to delete the one-time keys individually, a successful delete
    // mints the one-time key to the requester
    for item in item_vec {
      let pk = item.get_string(otk_table::PARTITION_KEY)?;
      let otk = item.get_string(otk_table::SORT_KEY)?;

      let composite_key = HashMap::from([
        (
          otk_table::PARTITION_KEY.to_string(),
          AttributeValue::S(pk.to_string()),
        ),
        (
          otk_table::SORT_KEY.to_string(),
          AttributeValue::S(otk.to_string()),
        ),
      ]);

      debug!("Attempting to delete a {:?} one time key", account_type);
      match self
        .client
        .delete_item()
        .set_key(Some(composite_key))
        .table_name(otk_table::NAME)
        .send()
        .await
      {
        Ok(_) => {
          result = Some(otk.to_string());
          break;
        }
        // This err should only happen if a delete occurred between the read
        // above and this delete
        Err(e) => {
          debug!("Unable to delete key: {:?}", e);
          continue;
        }
      }
    }

    // Return deleted key
    Ok(result)
  }

  pub async fn get_one_time_keys(
    &self,
    device_id: &str,
    account_type: OlmAccountType,
  ) -> Result<QueryOutput, Error> {
    use crate::constants::one_time_keys_table::*;

    // Add related prefix to partition key to grab the correct result set
    let partition_key =
      create_one_time_key_partition_key(device_id, account_type);

    self
      .client
      .query()
      .table_name(NAME)
      .key_condition_expression(format!("{} = :pk", PARTITION_KEY))
      .expression_attribute_values(":pk", AttributeValue::S(partition_key))
      .return_consumed_capacity(
        aws_sdk_dynamodb::model::ReturnConsumedCapacity::Total,
      )
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))
      .map(|response| {
        let capacity_units = response
          .consumed_capacity()
          .and_then(|it| it.capacity_units());
        debug!("OTK read consumed capacity: {:?}", capacity_units);
        response
      })
  }

  pub async fn set_prekey(
    &self,
    user_id: String,
    device_id: String,
    content_prekey: String,
    content_prekey_signature: String,
    notif_prekey: String,
    notif_prekey_signature: String,
  ) -> Result<(), Error> {
    let notif_prekey_av = AttributeValue::S(notif_prekey);
    let notif_prekey_signature_av = AttributeValue::S(notif_prekey_signature);
    let content_prekey_av = AttributeValue::S(content_prekey);
    let content_prekey_signature_av =
      AttributeValue::S(content_prekey_signature);

    let update_expression =
      format!("SET {0}.#{1}.{2} = :n, {0}.#{1}.{3} = :p, {0}.#{1}.{4} = :c, {0}.#{1}.{5} = :d",
        USERS_TABLE_DEVICES_ATTRIBUTE,
        "deviceID",
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME,
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
        USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME,
        USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
      );
    let expression_attribute_names = HashMap::from([
      (format!("#{}", "deviceID"), device_id),
      (
        "#user_id".to_string(),
        USERS_TABLE_PARTITION_KEY.to_string(),
      ),
    ]);
    let expression_attribute_values = HashMap::from([
      (":n".to_string(), notif_prekey_av),
      (":p".to_string(), notif_prekey_signature_av),
      (":c".to_string(), content_prekey_av),
      (":d".to_string(), content_prekey_signature_av),
    ]);

    self
      .client
      .update_item()
      .table_name(USERS_TABLE)
      .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id))
      .update_expression(update_expression)
      .condition_expression("attribute_exists(#user_id)")
      .set_expression_attribute_names(Some(expression_attribute_names))
      .set_expression_attribute_values(Some(expression_attribute_values))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    Ok(())
  }

  pub async fn append_one_time_prekeys(
    &self,
    device_id: String,
    content_one_time_keys: Vec<String>,
    notif_one_time_keys: Vec<String>,
  ) -> Result<(), Error> {
    use crate::constants::one_time_keys_table;

    let mut otk_requests = into_one_time_put_requests(
      &device_id,
      content_one_time_keys,
      OlmAccountType::Content,
    );
    let notif_otk_requests: Vec<WriteRequest> = into_one_time_put_requests(
      &device_id,
      notif_one_time_keys,
      OlmAccountType::Notification,
    );
    otk_requests.extend(notif_otk_requests);

    // BatchWriteItem has a hard limit of 25 writes per call
    for requests in otk_requests.chunks(25) {
      self
        .client
        .batch_write_item()
        .request_items(one_time_keys_table::NAME, requests.to_vec())
        .send()
        .await
        .map_err(|e| Error::AwsSdk(e.into()))?;
    }

    Ok(())
  }

  async fn add_device_to_users_table(
    &self,
    user_id: String,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
    social_proof: Option<String>,
  ) -> Result<(), Error> {
    // Avoid borrowing from lifetime of flattened_device_key_upload
    let device_id = flattened_device_key_upload.device_id_key.clone();
    let content_one_time_keys =
      flattened_device_key_upload.content_one_time_keys.clone();
    let notif_one_time_keys =
      flattened_device_key_upload.notif_one_time_keys.clone();

    let device_info =
      create_device_info(flattened_device_key_upload, social_proof);
    let update_expression =
      format!("SET {}.#{} = :v", USERS_TABLE_DEVICES_ATTRIBUTE, "deviceID",);
    let expression_attribute_names =
      HashMap::from([(format!("#{}", "deviceID"), device_id.clone())]);
    let expression_attribute_values =
      HashMap::from([(":v".to_string(), AttributeValue::M(device_info))]);

    self
      .client
      .update_item()
      .table_name(USERS_TABLE)
      .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id))
      .update_expression(update_expression)
      .set_expression_attribute_names(Some(expression_attribute_names))
      .set_expression_attribute_values(Some(expression_attribute_values))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    self
      .append_one_time_prekeys(
        device_id,
        content_one_time_keys,
        notif_one_time_keys,
      )
      .await?;

    Ok(())
  }

  pub async fn remove_device_from_users_table(
    &self,
    user_id: String,
    device_id_key: String,
  ) -> Result<(), Error> {
    let update_expression =
      format!("REMOVE {}.{}", USERS_TABLE_DEVICES_ATTRIBUTE, ":deviceID");

    let expression_attribute_values = HashMap::from([(
      ":deviceID".to_string(),
      AttributeValue::S(device_id_key),
    )]);

    self
      .client
      .update_item()
      .table_name(USERS_TABLE)
      .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id))
      .update_expression(update_expression)
      .set_expression_attribute_values(Some(expression_attribute_values))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    Ok(())
  }

  pub async fn update_user_password(
    &self,
    user_id: String,
    password_file: Vec<u8>,
  ) -> Result<(), Error> {
    let update_expression =
      format!("SET {} = :p", USERS_TABLE_REGISTRATION_ATTRIBUTE);
    let expression_attribute_values = HashMap::from([(
      ":p".to_string(),
      AttributeValue::B(Blob::new(password_file)),
    )]);

    self
      .client
      .update_item()
      .table_name(USERS_TABLE)
      .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id))
      .update_expression(update_expression)
      .set_expression_attribute_values(Some(expression_attribute_values))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    Ok(())
  }

  pub async fn delete_user(
    &self,
    user_id: String,
  ) -> Result<DeleteItemOutput, Error> {
    debug!("Attempting to delete user: {}", user_id);

    match self
      .client
      .delete_item()
      .table_name(USERS_TABLE)
      .key(
        USERS_TABLE_PARTITION_KEY,
        AttributeValue::S(user_id.clone()),
      )
      .send()
      .await
    {
      Ok(out) => {
        info!("User has been deleted {}", user_id);
        Ok(out)
      }
      Err(e) => {
        error!("DynamoDB client failed to delete user {}", user_id);
        Err(Error::AwsSdk(e.into()))
      }
    }
  }

  pub async fn get_access_token_data(
    &self,
    user_id: String,
    signing_public_key: String,
  ) -> Result<Option<AccessTokenData>, Error> {
    let primary_key = create_composite_primary_key(
      (
        ACCESS_TOKEN_TABLE_PARTITION_KEY.to_string(),
        user_id.clone(),
      ),
      (
        ACCESS_TOKEN_SORT_KEY.to_string(),
        signing_public_key.clone(),
      ),
    );
    let get_item_result = self
      .client
      .get_item()
      .table_name(ACCESS_TOKEN_TABLE)
      .set_key(Some(primary_key))
      .consistent_read(true)
      .send()
      .await;
    match get_item_result {
      Ok(GetItemOutput {
        item: Some(mut item),
        ..
      }) => {
        let created = parse_date_time_attribute(
          ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE,
          item.remove(ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE),
        )?;
        let auth_type = parse_auth_type_attribute(
          item.remove(ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE),
        )?;
        let valid = parse_valid_attribute(
          item.remove(ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE),
        )?;
        let access_token = parse_token_attribute(
          item.remove(ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE),
        )?;
        Ok(Some(AccessTokenData {
          user_id,
          signing_public_key,
          access_token,
          created,
          auth_type,
          valid,
        }))
      }
      Ok(_) => {
        info!(
          "No item found for user {} and signing public key {} in token table",
          user_id, signing_public_key
        );
        Ok(None)
      }
      Err(e) => {
        error!(
          "DynamoDB client failed to get token for user {} with signing public key {}: {}",
          user_id, signing_public_key, e
        );
        Err(Error::AwsSdk(e.into()))
      }
    }
  }

  pub async fn verify_access_token(
    &self,
    user_id: String,
    signing_public_key: String,
    access_token_to_verify: String,
  ) -> Result<bool, Error> {
    let is_valid = self
      .get_access_token_data(user_id, signing_public_key)
      .await?
      .map(|access_token_data| {
        constant_time_eq(
          access_token_data.access_token.as_bytes(),
          access_token_to_verify.as_bytes(),
        ) && access_token_data.is_valid()
      })
      .unwrap_or(false);

    Ok(is_valid)
  }

  pub async fn put_access_token_data(
    &self,
    access_token_data: AccessTokenData,
  ) -> Result<PutItemOutput, Error> {
    let item = HashMap::from([
      (
        ACCESS_TOKEN_TABLE_PARTITION_KEY.to_string(),
        AttributeValue::S(access_token_data.user_id),
      ),
      (
        ACCESS_TOKEN_SORT_KEY.to_string(),
        AttributeValue::S(access_token_data.signing_public_key),
      ),
      (
        ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE.to_string(),
        AttributeValue::S(access_token_data.access_token),
      ),
      (
        ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE.to_string(),
        AttributeValue::S(access_token_data.created.to_rfc3339()),
      ),
      (
        ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE.to_string(),
        AttributeValue::S(match access_token_data.auth_type {
          AuthType::Password => "password".to_string(),
          AuthType::Wallet => "wallet".to_string(),
        }),
      ),
      (
        ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE.to_string(),
        AttributeValue::Bool(access_token_data.valid),
      ),
    ]);
    self
      .client
      .put_item()
      .table_name(ACCESS_TOKEN_TABLE)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))
  }

  pub async fn delete_access_token_data(
    &self,
    user_id: String,
    device_id_key: String,
  ) -> Result<(), Error> {
    self
      .client
      .delete_item()
      .table_name(ACCESS_TOKEN_TABLE)
      .key(
        ACCESS_TOKEN_TABLE_PARTITION_KEY.to_string(),
        AttributeValue::S(user_id),
      )
      .key(
        ACCESS_TOKEN_SORT_KEY.to_string(),
        AttributeValue::S(device_id_key),
      )
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    Ok(())
  }

  pub async fn username_taken(&self, username: String) -> Result<bool, Error> {
    let result = self
      .get_user_id_from_user_info(username, &AuthType::Password)
      .await?;

    Ok(result.is_some())
  }

  pub async fn filter_out_taken_usernames(
    &self,
    usernames: Vec<String>,
  ) -> Result<Vec<String>, Error> {
    let db_usernames = self.get_all_usernames().await?;

    let db_usernames_set: HashSet<String> = db_usernames.into_iter().collect();
    let usernames_set: HashSet<String> = usernames.into_iter().collect();

    let available_usernames: Vec<String> = usernames_set
      .difference(&db_usernames_set)
      .cloned()
      .collect();

    Ok(available_usernames)
  }

  async fn get_user_from_user_info(
    &self,
    user_info: String,
    auth_type: &AuthType,
  ) -> Result<Option<HashMap<String, AttributeValue>>, Error> {
    let (index, attribute_name) = match auth_type {
      AuthType::Password => {
        (USERS_TABLE_USERNAME_INDEX, USERS_TABLE_USERNAME_ATTRIBUTE)
      }
      AuthType::Wallet => (
        USERS_TABLE_WALLET_ADDRESS_INDEX,
        USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
      ),
    };
    match self
      .client
      .query()
      .table_name(USERS_TABLE)
      .index_name(index)
      .key_condition_expression(format!("{} = :u", attribute_name))
      .expression_attribute_values(":u", AttributeValue::S(user_info.clone()))
      .send()
      .await
    {
      Ok(QueryOutput {
        items: Some(items), ..
      }) => {
        let num_items = items.len();
        if num_items == 0 {
          return Ok(None);
        }
        if num_items > 1 {
          warn!(
            "{} user IDs associated with {} {}: {:?}",
            num_items, attribute_name, user_info, items
          );
        }
        let first_item = items[0].clone();
        let user_id = first_item
          .get(USERS_TABLE_PARTITION_KEY)
          .ok_or(DBItemError {
            attribute_name: USERS_TABLE_PARTITION_KEY.to_string(),
            attribute_value: None,
            attribute_error: DBItemAttributeError::Missing,
          })?
          .as_s()
          .map_err(|_| DBItemError {
            attribute_name: USERS_TABLE_PARTITION_KEY.to_string(),
            attribute_value: first_item.get(USERS_TABLE_PARTITION_KEY).cloned(),
            attribute_error: DBItemAttributeError::IncorrectType,
          })?;
        let result = self.get_item_from_users_table(user_id).await?;
        Ok(result.item)
      }
      Ok(_) => {
        info!(
          "No item found for {} {} in users table",
          attribute_name, user_info
        );
        Ok(None)
      }
      Err(e) => {
        error!(
          "DynamoDB client failed to get user from {} {}: {}",
          attribute_name, user_info, e
        );
        Err(Error::AwsSdk(e.into()))
      }
    }
  }

  pub async fn get_keys_for_user(
    &self,
    user_info: String,
    auth_type: &AuthType,
    get_one_time_keys: bool,
  ) -> Result<Option<Devices>, Error> {
    let Some(mut user) =
      self.get_user_from_user_info(user_info, auth_type).await?
    else {
      return Ok(None);
    };

    let devices = parse_map_attribute(
      USERS_TABLE_DEVICES_ATTRIBUTE,
      user.remove(USERS_TABLE_DEVICES_ATTRIBUTE),
    )?;

    let mut devices_response = HashMap::with_capacity(devices.len());
    for (device_id_key, device_info) in devices {
      let device_info_map =
        parse_map_attribute(&device_id_key, Some(device_info))?;

      let mut device_info_string_map = HashMap::new();
      for (attribute_name, attribute_value) in device_info_map {
        // Excluding one-time keys since we're moving them to a separate table
        if attribute_name
          == USERS_TABLE_DEVICES_MAP_NOTIF_ONE_TIME_KEYS_ATTRIBUTE_NAME
          || attribute_name
            == USERS_TABLE_DEVICES_MAP_CONTENT_ONE_TIME_KEYS_ATTRIBUTE_NAME
        {
          continue;
        }

        let attribute_value_str =
          parse_string_attribute(&attribute_name, Some(attribute_value))?;
        device_info_string_map.insert(attribute_name, attribute_value_str);
      }

      if get_one_time_keys {
        if let Some(notif_one_time_key) = self
          .get_one_time_key(&device_id_key, OlmAccountType::Notification)
          .await?
        {
          device_info_string_map
            .insert(NOTIF_ONE_TIME_KEY.to_string(), notif_one_time_key);
        }
        if let Some(content_one_time_key) = self
          .get_one_time_key(&device_id_key, OlmAccountType::Content)
          .await?
        {
          device_info_string_map
            .insert(CONTENT_ONE_TIME_KEY.to_string(), content_one_time_key);
        }
      }

      devices_response.insert(device_id_key, device_info_string_map);
    }

    Ok(Some(devices_response))
  }

  pub async fn get_user_id_from_user_info(
    &self,
    user_info: String,
    auth_type: &AuthType,
  ) -> Result<Option<String>, Error> {
    match self
      .get_user_from_user_info(user_info.clone(), auth_type)
      .await
    {
      Ok(Some(mut user)) => parse_string_attribute(
        USERS_TABLE_PARTITION_KEY,
        user.remove(USERS_TABLE_PARTITION_KEY),
      )
      .map(Some)
      .map_err(Error::Attribute),
      Ok(_) => Ok(None),
      Err(e) => Err(e),
    }
  }

  pub async fn get_user_id_and_password_file_from_username(
    &self,
    username: &str,
  ) -> Result<Option<(String, Vec<u8>)>, Error> {
    match self
      .get_user_from_user_info(username.to_string(), &AuthType::Password)
      .await
    {
      Ok(Some(mut user)) => {
        let user_id = parse_string_attribute(
          USERS_TABLE_PARTITION_KEY,
          user.remove(USERS_TABLE_PARTITION_KEY),
        )?;
        let password_file = parse_registration_data_attribute(
          user.remove(USERS_TABLE_REGISTRATION_ATTRIBUTE),
        )?;

        Ok(Some((user_id, password_file)))
      }
      Ok(_) => {
        info!(
          "No item found for user {} in PAKE registration table",
          username
        );
        Ok(None)
      }
      Err(e) => {
        error!(
          "DynamoDB client failed to get registration data for user {}: {}",
          username, e
        );
        Err(e)
      }
    }
  }

  pub async fn get_item_from_users_table(
    &self,
    user_id: &str,
  ) -> Result<GetItemOutput, Error> {
    let primary_key = create_simple_primary_key((
      USERS_TABLE_PARTITION_KEY.to_string(),
      user_id.to_string(),
    ));
    self
      .client
      .get_item()
      .table_name(USERS_TABLE)
      .set_key(Some(primary_key))
      .consistent_read(true)
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))
  }

  async fn get_all_usernames(&self) -> Result<Vec<String>, Error> {
    let scan_output = self
      .client
      .scan()
      .table_name(USERS_TABLE)
      .projection_expression(USERS_TABLE_USERNAME_ATTRIBUTE)
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let mut result = Vec::new();
    if let Some(attributes) = scan_output.items {
      for mut attribute in attributes {
        if let Ok(username) = parse_string_attribute(
          USERS_TABLE_USERNAME_ATTRIBUTE,
          attribute.remove(USERS_TABLE_USERNAME_ATTRIBUTE),
        ) {
          result.push(username);
        }
      }
    }
    Ok(result)
  }

  pub async fn add_nonce_to_nonces_table(
    &self,
    nonce_data: NonceData,
  ) -> Result<PutItemOutput, Error> {
    let item = HashMap::from([
      (
        NONCE_TABLE_PARTITION_KEY.to_string(),
        AttributeValue::S(nonce_data.nonce),
      ),
      (
        NONCE_TABLE_CREATED_ATTRIBUTE.to_string(),
        AttributeValue::S(nonce_data.created.to_rfc3339()),
      ),
      (
        NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE.to_string(),
        AttributeValue::S(nonce_data.expiration_time.to_rfc3339()),
      ),
      (
        NONCE_TABLE_EXPIRATION_TIME_UNIX_ATTRIBUTE.to_string(),
        AttributeValue::N(nonce_data.expiration_time.timestamp().to_string()),
      ),
    ]);
    self
      .client
      .put_item()
      .table_name(NONCE_TABLE)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))
  }

  pub async fn get_nonce_from_nonces_table(
    &self,
    nonce_value: impl Into<String>,
  ) -> Result<Option<NonceData>, Error> {
    let get_response = self
      .client
      .get_item()
      .table_name(NONCE_TABLE)
      .key(
        NONCE_TABLE_PARTITION_KEY,
        AttributeValue::S(nonce_value.into()),
      )
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let Some(mut item) = get_response.item else {
      return Ok(None);
    };

    let nonce = parse_string_attribute(
      NONCE_TABLE_PARTITION_KEY,
      item.remove(&NONCE_TABLE_PARTITION_KEY.to_string()),
    )?;

    let created = parse_date_time_attribute(
      NONCE_TABLE_CREATED_ATTRIBUTE,
      item.remove(&NONCE_TABLE_CREATED_ATTRIBUTE.to_string()),
    )?;

    let expiration_time = parse_date_time_attribute(
      NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE,
      item.remove(&NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE.to_string()),
    )?;

    Ok(Some(NonceData {
      nonce,
      created,
      expiration_time,
    }))
  }

  pub async fn remove_nonce_from_nonces_table(
    &self,
    nonce: impl Into<String>,
  ) -> Result<(), Error> {
    self
      .client
      .delete_item()
      .table_name(NONCE_TABLE)
      .key(NONCE_TABLE_PARTITION_KEY, AttributeValue::S(nonce.into()))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    Ok(())
  }

  pub async fn add_usernames_to_reserved_usernames_table(
    &self,
    usernames: Vec<String>,
  ) -> Result<(), Error> {
    // A single call to BatchWriteItem can consist of up to 25 operations
    for usernames_chunk in usernames.chunks(25) {
      let write_requests = usernames_chunk
        .iter()
        .map(|username| {
          let put_request = PutRequest::builder()
            .item(
              RESERVED_USERNAMES_TABLE_PARTITION_KEY,
              AttributeValue::S(username.to_string()),
            )
            .build();

          WriteRequest::builder().put_request(put_request).build()
        })
        .collect();

      self
        .client
        .batch_write_item()
        .request_items(RESERVED_USERNAMES_TABLE, write_requests)
        .send()
        .await
        .map_err(|e| Error::AwsSdk(e.into()))?;
    }

    info!("Batch write item to reserved usernames table succeeded");

    Ok(())
  }

  pub async fn delete_username_from_reserved_usernames_table(
    &self,
    username: String,
  ) -> Result<DeleteItemOutput, Error> {
    debug!(
      "Attempting to delete username {} from reserved usernames table",
      username
    );

    match self
      .client
      .delete_item()
      .table_name(RESERVED_USERNAMES_TABLE)
      .key(
        RESERVED_USERNAMES_TABLE_PARTITION_KEY,
        AttributeValue::S(username.clone()),
      )
      .send()
      .await
    {
      Ok(out) => {
        info!(
          "Username {} has been deleted from reserved usernames table",
          username
        );
        Ok(out)
      }
      Err(e) => {
        error!("DynamoDB client failed to delete username {} from reserved usernames table", username);
        Err(Error::AwsSdk(e.into()))
      }
    }
  }

  pub async fn username_in_reserved_usernames_table(
    &self,
    username: &str,
  ) -> Result<bool, Error> {
    match self
      .client
      .get_item()
      .table_name(RESERVED_USERNAMES_TABLE)
      .key(
        RESERVED_USERNAMES_TABLE_PARTITION_KEY.to_string(),
        AttributeValue::S(username.to_string()),
      )
      .consistent_read(true)
      .send()
      .await
    {
      Ok(GetItemOutput { item: Some(_), .. }) => Ok(true),
      Ok(_) => Ok(false),
      Err(e) => Err(Error::AwsSdk(e.into())),
    }
  }
}

type AttributeName = String;
pub type DeviceKeys = HashMap<String, String>;
type Devices = HashMap<String, DeviceKeys>;

fn create_simple_primary_key(
  partition_key: (AttributeName, String),
) -> HashMap<AttributeName, AttributeValue> {
  HashMap::from([(partition_key.0, AttributeValue::S(partition_key.1))])
}

fn create_composite_primary_key(
  partition_key: (AttributeName, String),
  sort_key: (AttributeName, String),
) -> HashMap<AttributeName, AttributeValue> {
  let mut primary_key = create_simple_primary_key(partition_key);
  primary_key.insert(sort_key.0, AttributeValue::S(sort_key.1));
  primary_key
}

fn parse_date_time_attribute(
  attribute_name: &str,
  attribute: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  if let Some(AttributeValue::S(created)) = &attribute {
    created.parse().map_err(|e| {
      DBItemError::new(
        attribute_name.to_string(),
        attribute,
        DBItemAttributeError::InvalidTimestamp(e),
      )
    })
  } else {
    Err(DBItemError::new(
      attribute_name.to_string(),
      attribute,
      DBItemAttributeError::Missing,
    ))
  }
}

fn parse_auth_type_attribute(
  attribute: Option<AttributeValue>,
) -> Result<AuthType, DBItemError> {
  if let Some(AttributeValue::S(auth_type)) = &attribute {
    match auth_type.as_str() {
      "password" => Ok(AuthType::Password),
      "wallet" => Ok(AuthType::Wallet),
      _ => Err(DBItemError::new(
        ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE.to_string(),
        attribute,
        DBItemAttributeError::IncorrectType,
      )),
    }
  } else {
    Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE.to_string(),
      attribute,
      DBItemAttributeError::Missing,
    ))
  }
}

fn parse_valid_attribute(
  attribute: Option<AttributeValue>,
) -> Result<bool, DBItemError> {
  match attribute {
    Some(AttributeValue::Bool(valid)) => Ok(valid),
    Some(_) => Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE.to_string(),
      attribute,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE.to_string(),
      attribute,
      DBItemAttributeError::Missing,
    )),
  }
}

fn parse_token_attribute(
  attribute: Option<AttributeValue>,
) -> Result<String, DBItemError> {
  match attribute {
    Some(AttributeValue::S(token)) => Ok(token),
    Some(_) => Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE.to_string(),
      attribute,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE.to_string(),
      attribute,
      DBItemAttributeError::Missing,
    )),
  }
}

fn parse_registration_data_attribute(
  attribute: Option<AttributeValue>,
) -> Result<Vec<u8>, DBItemError> {
  match attribute {
    Some(AttributeValue::B(server_registration_bytes)) => {
      Ok(server_registration_bytes.into_inner())
    }
    Some(_) => Err(DBItemError::new(
      USERS_TABLE_REGISTRATION_ATTRIBUTE.to_string(),
      attribute,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      USERS_TABLE_REGISTRATION_ATTRIBUTE.to_string(),
      attribute,
      DBItemAttributeError::Missing,
    )),
  }
}

#[allow(dead_code)]
fn parse_map_attribute(
  attribute_name: &str,
  attribute_value: Option<AttributeValue>,
) -> Result<HashMap<String, AttributeValue>, DBItemError> {
  match attribute_value {
    Some(AttributeValue::M(map)) => Ok(map),
    Some(_) => {
      error!(
          attribute = attribute_name,
          value = ?attribute_value,
          error_type = "IncorrectType",
          "Unexpected attribute type when parsing map attribute"
      );
      Err(DBItemError::new(
        attribute_name.to_string(),
        attribute_value,
        DBItemAttributeError::IncorrectType,
      ))
    }
    None => {
      error!(
        attribute = attribute_name,
        error_type = "Missing",
        "Attribute is missing"
      );
      Err(DBItemError::new(
        attribute_name.to_string(),
        attribute_value,
        DBItemAttributeError::Missing,
      ))
    }
  }
}

fn parse_string_attribute(
  attribute_name: &str,
  attribute_value: Option<AttributeValue>,
) -> Result<String, DBItemError> {
  match attribute_value {
    Some(AttributeValue::S(value)) => Ok(value),
    Some(_) => {
      error!(
          attribute = attribute_name,
          value = ?attribute_value,
          error_type = "IncorrectType",
          "Unexpected attribute type when parsing string attribute"
      );
      Err(DBItemError::new(
        attribute_name.to_string(),
        attribute_value,
        DBItemAttributeError::IncorrectType,
      ))
    }
    None => {
      error!(
        attribute = attribute_name,
        error_type = "Missing",
        "Attribute is missing"
      );
      Err(DBItemError::new(
        attribute_name.to_string(),
        attribute_value,
        DBItemAttributeError::Missing,
      ))
    }
  }
}

fn create_device_info(
  flattened_device_key_upload: FlattenedDeviceKeyUpload,
  social_proof: Option<String>,
) -> HashMap<String, AttributeValue> {
  let mut device_info = HashMap::from([
    (
      USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME.to_string(),
      AttributeValue::S(flattened_device_key_upload.device_type.to_string()),
    ),
    (
      USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME.to_string(),
      AttributeValue::S(flattened_device_key_upload.key_payload),
    ),
    (
      USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME.to_string(),
      AttributeValue::S(flattened_device_key_upload.key_payload_signature),
    ),
    (
      USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME.to_string(),
      AttributeValue::S(flattened_device_key_upload.content_prekey),
    ),
    (
      USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME
        .to_string(),
      AttributeValue::S(flattened_device_key_upload.content_prekey_signature),
    ),
    (
      USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME.to_string(),
      AttributeValue::S(flattened_device_key_upload.notif_prekey),
    ),
    (
      USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME.to_string(),
      AttributeValue::S(flattened_device_key_upload.notif_prekey_signature),
    ),
  ]);

  if let Some(social_proof) = social_proof {
    device_info.insert(
      USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME.to_string(),
      AttributeValue::S(social_proof),
    );
  }

  device_info
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_create_simple_primary_key() {
    let partition_key_name = "userID".to_string();
    let partition_key_value = "12345".to_string();
    let partition_key =
      (partition_key_name.clone(), partition_key_value.clone());
    let mut primary_key = create_simple_primary_key(partition_key);
    assert_eq!(primary_key.len(), 1);
    let attribute = primary_key.remove(&partition_key_name);
    assert!(attribute.is_some());
    assert_eq!(attribute, Some(AttributeValue::S(partition_key_value)));
  }

  #[test]
  fn test_create_composite_primary_key() {
    let partition_key_name = "userID".to_string();
    let partition_key_value = "12345".to_string();
    let partition_key =
      (partition_key_name.clone(), partition_key_value.clone());
    let sort_key_name = "deviceID".to_string();
    let sort_key_value = "54321".to_string();
    let sort_key = (sort_key_name.clone(), sort_key_value.clone());
    let mut primary_key = create_composite_primary_key(partition_key, sort_key);
    assert_eq!(primary_key.len(), 2);
    let partition_key_attribute = primary_key.remove(&partition_key_name);
    assert!(partition_key_attribute.is_some());
    assert_eq!(
      partition_key_attribute,
      Some(AttributeValue::S(partition_key_value))
    );
    let sort_key_attribute = primary_key.remove(&sort_key_name);
    assert!(sort_key_attribute.is_some());
    assert_eq!(sort_key_attribute, Some(AttributeValue::S(sort_key_value)))
  }

  #[test]
  fn validate_keys() {
    // Taken from test user
    let example_payload = r#"{\"notificationIdentityPublicKeys\":{\"curve25519\":\"DYmV8VdkjwG/VtC8C53morogNJhpTPT/4jzW0/cxzQo\",\"ed25519\":\"D0BV2Y7Qm36VUtjwyQTJJWYAycN7aMSJmhEsRJpW2mk\"},\"primaryIdentityPublicKeys\":{\"curve25519\":\"Y4ZIqzpE1nv83kKGfvFP6rifya0itRg2hifqYtsISnk\",\"ed25519\":\"cSlL+VLLJDgtKSPlIwoCZg0h0EmHlQoJC08uV/O+jvg\"}}"#;
    let serialized_payload = KeyPayload::from_str(&example_payload).unwrap();

    assert_eq!(
      serialized_payload
        .notification_identity_public_keys
        .curve25519,
      "DYmV8VdkjwG/VtC8C53morogNJhpTPT/4jzW0/cxzQo"
    );
  }
}
