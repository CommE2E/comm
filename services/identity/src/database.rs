use comm_lib::aws::ddb::{
  operation::{
    delete_item::DeleteItemOutput, get_item::GetItemOutput,
    put_item::PutItemOutput, query::QueryOutput,
  },
  primitives::Blob,
  types::{AttributeValue, PutRequest, ReturnConsumedCapacity, WriteRequest},
};
use comm_lib::aws::{AwsConfig, DynamoDBClient};
use comm_lib::database::{
  AttributeExtractor, AttributeMap, DBItemAttributeError, DBItemError,
  TryFromAttribute,
};
use constant_time_eq::constant_time_eq;
use std::collections::{HashMap, HashSet};
use std::str::FromStr;
use std::sync::Arc;

use crate::{
  constants::USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME,
  ddb_utils::EthereumIdentity, reserved_users::UserDetail, siwe::SocialProof,
};
use crate::{
  ddb_utils::{
    create_one_time_key_partition_key, into_one_time_put_requests, Identifier,
    OlmAccountType,
  },
  grpc_services::protos,
};
use crate::{
  error::{consume_error, Error},
  grpc_utils::DeviceKeysInfo,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

use crate::client_service::{FlattenedDeviceKeyUpload, UserRegistrationInfo};
use crate::config::CONFIG;
use crate::constants::{
  ACCESS_TOKEN_SORT_KEY, ACCESS_TOKEN_TABLE,
  ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE, ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_PARTITION_KEY, ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE, NONCE_TABLE,
  NONCE_TABLE_CREATED_ATTRIBUTE, NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE,
  NONCE_TABLE_EXPIRATION_TIME_UNIX_ATTRIBUTE, NONCE_TABLE_PARTITION_KEY,
  RESERVED_USERNAMES_TABLE, RESERVED_USERNAMES_TABLE_PARTITION_KEY,
  RESERVED_USERNAMES_TABLE_USER_ID_ATTRIBUTE, USERS_TABLE,
  USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME,
  USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME, USERS_TABLE_PARTITION_KEY,
  USERS_TABLE_REGISTRATION_ATTRIBUTE, USERS_TABLE_USERNAME_ATTRIBUTE,
  USERS_TABLE_USERNAME_INDEX, USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
  USERS_TABLE_WALLET_ADDRESS_INDEX,
};
use crate::id::generate_uuid;
use crate::nonce::NonceData;
use crate::token::{AccessTokenData, AuthType};
pub use grpc_clients::identity::DeviceType;

mod device_list;
mod farcaster;
mod workflows;
pub use device_list::{DeviceListRow, DeviceListUpdate, DeviceRow};

use self::device_list::Prekey;

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

pub struct DBDeviceTypeInt(pub i32);

impl TryFrom<DBDeviceTypeInt> for DeviceType {
  type Error = crate::error::Error;

  fn try_from(value: DBDeviceTypeInt) -> Result<Self, Self::Error> {
    let device_result = DeviceType::try_from(value.0);

    device_result.map_err(|_| {
      Error::Attribute(DBItemError {
        attribute_name: USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME
          .to_string(),
        attribute_value: Some(AttributeValue::N(value.0.to_string())).into(),
        attribute_error: DBItemAttributeError::InvalidValue,
      })
    })
  }
}

pub struct OutboundKeys {
  pub key_payload: String,
  pub key_payload_signature: String,
  pub social_proof: Option<String>,
  pub content_prekey: Prekey,
  pub notif_prekey: Prekey,
  pub content_one_time_key: Option<String>,
  pub notif_one_time_key: Option<String>,
}

impl From<OutboundKeys> for protos::auth::OutboundKeyInfo {
  fn from(db_keys: OutboundKeys) -> Self {
    use protos::unauth::IdentityKeyInfo;
    Self {
      identity_info: Some(IdentityKeyInfo {
        payload: db_keys.key_payload,
        payload_signature: db_keys.key_payload_signature,
        social_proof: db_keys.social_proof,
      }),
      content_prekey: Some(db_keys.content_prekey.into()),
      notif_prekey: Some(db_keys.notif_prekey.into()),
      one_time_content_prekey: db_keys.content_one_time_key,
      one_time_notif_prekey: db_keys.notif_one_time_key,
    }
  }
}

#[derive(Clone)]
pub struct DatabaseClient {
  client: Arc<DynamoDBClient>,
}

impl DatabaseClient {
  pub fn new(aws_config: &AwsConfig) -> Self {
    let client = match &CONFIG.localstack_endpoint {
      Some(endpoint) => {
        info!(
          "Configuring DynamoDB client to use LocalStack endpoint: {}",
          endpoint
        );
        let ddb_config_builder =
          comm_lib::aws::ddb::config::Builder::from(aws_config)
            .endpoint_url(endpoint);
        DynamoDBClient::from_conf(ddb_config_builder.build())
      }
      None => DynamoDBClient::new(aws_config),
    };

    DatabaseClient {
      client: Arc::new(client),
    }
  }

  pub async fn add_password_user_to_users_table(
    &self,
    registration_state: UserRegistrationInfo,
    password_file: Vec<u8>,
    code_version: u64,
    access_token_creation_time: DateTime<Utc>,
  ) -> Result<String, Error> {
    let device_key_upload = registration_state.flattened_device_key_upload;
    let user_id = self
      .add_user_to_users_table(
        device_key_upload.clone(),
        Some((registration_state.username, Blob::new(password_file))),
        None,
        registration_state.user_id,
        registration_state.farcaster_id,
      )
      .await?;

    self
      .add_device(
        &user_id,
        device_key_upload,
        code_version,
        access_token_creation_time,
      )
      .await?;

    Ok(user_id)
  }

  pub async fn add_wallet_user_to_users_table(
    &self,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
    wallet_address: String,
    social_proof: SocialProof,
    user_id: Option<String>,
    code_version: u64,
    access_token_creation_time: DateTime<Utc>,
    farcaster_id: Option<String>,
  ) -> Result<String, Error> {
    let wallet_identity = EthereumIdentity {
      wallet_address,
      social_proof,
    };
    let user_id = self
      .add_user_to_users_table(
        flattened_device_key_upload.clone(),
        None,
        Some(wallet_identity),
        user_id,
        farcaster_id,
      )
      .await?;

    self
      .add_device(
        &user_id,
        flattened_device_key_upload,
        code_version,
        access_token_creation_time,
      )
      .await?;

    Ok(user_id)
  }

  async fn add_user_to_users_table(
    &self,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
    username_and_password_file: Option<(String, Blob)>,
    wallet_identity: Option<EthereumIdentity>,
    user_id: Option<String>,
    farcaster_id: Option<String>,
  ) -> Result<String, Error> {
    let user_id = user_id.unwrap_or_else(generate_uuid);
    let mut user = HashMap::from([(
      USERS_TABLE_PARTITION_KEY.to_string(),
      AttributeValue::S(user_id.clone()),
    )]);

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

    if let Some(eth_identity) = wallet_identity {
      user.insert(
        USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE.to_string(),
        AttributeValue::S(eth_identity.wallet_address),
      );
      user.insert(
        USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME.to_string(),
        eth_identity.social_proof.into(),
      );
    }

    if let Some(fid) = farcaster_id {
      user.insert(
        USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME.to_string(),
        AttributeValue::S(fid),
      );
    }

    self
      .client
      .put_item()
      .table_name(USERS_TABLE)
      .set_item(Some(user))
      // make sure we don't accidentaly overwrite existing row
      .condition_expression("attribute_not_exists(#pk)")
      .expression_attribute_names("#pk", USERS_TABLE_PARTITION_KEY)
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

  pub async fn add_user_device(
    &self,
    user_id: String,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
    code_version: u64,
    access_token_creation_time: DateTime<Utc>,
  ) -> Result<(), Error> {
    let content_one_time_keys =
      flattened_device_key_upload.content_one_time_keys.clone();
    let notif_one_time_keys =
      flattened_device_key_upload.notif_one_time_keys.clone();

    // add device to the device list if not exists
    let device_id = flattened_device_key_upload.device_id_key.clone();
    let device_exists = self
      .device_exists(user_id.clone(), device_id.clone())
      .await?;

    if device_exists {
      self
        .update_device_login_time(
          user_id.clone(),
          device_id,
          access_token_creation_time,
        )
        .await?;
      return Ok(());
    }

    // add device to the new device list
    self
      .add_device(
        user_id,
        flattened_device_key_upload,
        code_version,
        access_token_creation_time,
      )
      .await?;

    self
      .append_one_time_prekeys(
        device_id,
        content_one_time_keys,
        notif_one_time_keys,
      )
      .await?;

    Ok(())
  }

  pub async fn get_keyserver_keys_for_user(
    &self,
    user_id: &str,
  ) -> Result<Option<OutboundKeys>, Error> {
    use crate::grpc_services::protos::unauth::DeviceType as GrpcDeviceType;

    // DynamoDB doesn't have a way to "pop" a value from a list, so we must
    // first read in user info, then update one_time_keys with value we
    // gave to requester
    let mut user_info = self
      .get_item_from_users_table(user_id)
      .await?
      .item
      .ok_or(Error::MissingItem)?;

    let user_id: String = user_info.take_attr(USERS_TABLE_PARTITION_KEY)?;
    let social_proof: Option<String> =
      user_info.take_attr(USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME)?;
    let user_devices = self.get_current_devices(user_id).await?;
    let maybe_keyserver_device = user_devices
      .into_iter()
      .find(|device| device.device_type == GrpcDeviceType::Keyserver);

    let Some(keyserver) = maybe_keyserver_device else {
      return Ok(None);
    };
    debug!(
      "Found keyserver in devices table (ID={})",
      &keyserver.device_id
    );

    let notif_one_time_key: Option<String> = self
      .get_one_time_key(&keyserver.device_id, OlmAccountType::Notification)
      .await?;
    let content_one_time_key: Option<String> = self
      .get_one_time_key(&keyserver.device_id, OlmAccountType::Content)
      .await?;

    debug!(
      "Able to get notif one-time key for keyserver {}: {}",
      &keyserver.device_id,
      notif_one_time_key.is_some()
    );
    debug!(
      "Able to get content one-time key for keyserver {}: {}",
      &keyserver.device_id,
      content_one_time_key.is_some()
    );

    let outbound_payload = OutboundKeys {
      key_payload: keyserver.device_key_info.key_payload,
      key_payload_signature: keyserver.device_key_info.key_payload_signature,
      social_proof,
      content_prekey: keyserver.content_prekey,
      notif_prekey: keyserver.notif_prekey,
      content_one_time_key,
      notif_one_time_key,
    };

    Ok(Some(outbound_payload))
  }

  pub async fn get_keyserver_device_id_for_user(
    &self,
    user_id: &str,
  ) -> Result<Option<String>, Error> {
    use crate::grpc_services::protos::unauth::DeviceType as GrpcDeviceType;

    let user_devices = self.get_current_devices(user_id).await?;
    let maybe_keyserver_device_id = user_devices
      .into_iter()
      .find(|device| device.device_type == GrpcDeviceType::Keyserver)
      .map(|device| device.device_id);

    Ok(maybe_keyserver_device_id)
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
      let pk: String = item.get_attr(otk_table::PARTITION_KEY)?;
      let otk: String = item.get_attr(otk_table::SORT_KEY)?;

      let composite_key = HashMap::from([
        (otk_table::PARTITION_KEY.to_string(), AttributeValue::S(pk)),
        (
          otk_table::SORT_KEY.to_string(),
          AttributeValue::S(otk.clone()),
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
          result = Some(otk);
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
      .return_consumed_capacity(ReturnConsumedCapacity::Total)
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
    debug!(user_id, "Attempting to delete user's devices");
    self.delete_devices_table_rows_for_user(&user_id).await?;

    debug!(user_id, "Attempting to delete user");
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
        let created = DateTime::<Utc>::try_from_attr(
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

  pub async fn wallet_address_taken(
    &self,
    wallet_address: String,
  ) -> Result<bool, Error> {
    let result = self
      .get_user_id_from_user_info(wallet_address, &AuthType::Wallet)
      .await?;

    Ok(result.is_some())
  }

  pub async fn username_taken(&self, username: String) -> Result<bool, Error> {
    let result = self
      .get_user_id_from_user_info(username, &AuthType::Password)
      .await?;

    Ok(result.is_some())
  }

  pub async fn filter_out_taken_usernames(
    &self,
    user_details: Vec<UserDetail>,
  ) -> Result<Vec<UserDetail>, Error> {
    let db_usernames = self.get_all_usernames().await?;

    let db_usernames_set: HashSet<String> = db_usernames.into_iter().collect();

    let available_user_details: Vec<UserDetail> = user_details
      .into_iter()
      .filter(|user_detail| !db_usernames_set.contains(&user_detail.username))
      .collect();

    Ok(available_user_details)
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
            attribute_value: None.into(),
            attribute_error: DBItemAttributeError::Missing,
          })?
          .as_s()
          .map_err(|_| DBItemError {
            attribute_name: USERS_TABLE_PARTITION_KEY.to_string(),
            attribute_value: first_item
              .get(USERS_TABLE_PARTITION_KEY)
              .cloned()
              .into(),
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
    user_id: &str,
    get_one_time_keys: bool,
  ) -> Result<Option<Devices>, Error> {
    let mut devices_response = self.get_keys_for_user_devices(user_id).await?;
    if devices_response.is_empty() {
      debug!("No devices found for user {}", user_id);
      return Ok(None);
    }

    if get_one_time_keys {
      for (device_id_key, device_keys) in devices_response.iter_mut() {
        device_keys.notif_one_time_key = self
          .get_one_time_key(device_id_key, OlmAccountType::Notification)
          .await?;
        device_keys.content_one_time_key = self
          .get_one_time_key(device_id_key, OlmAccountType::Content)
          .await?;
      }
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
      Ok(Some(mut user)) => user
        .take_attr(USERS_TABLE_PARTITION_KEY)
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
        let user_id = user.take_attr(USERS_TABLE_PARTITION_KEY)?;
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

  /// Retrieves username for password users or wallet address for wallet users
  /// Returns `None` if user not found
  pub async fn get_user_identifier(
    &self,
    user_id: &str,
  ) -> Result<Option<Identifier>, Error> {
    self
      .get_item_from_users_table(user_id)
      .await?
      .item
      .map(Identifier::try_from)
      .transpose()
      .map_err(|e| {
        error!(user_id, "Database item is missing an identifier");
        e
      })
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
        if let Ok(username) =
          attribute.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE)
        {
          result.push(username);
        }
      }
    }
    Ok(result)
  }

  pub async fn get_all_user_details(&self) -> Result<Vec<UserDetail>, Error> {
    let scan_output = self
      .client
      .scan()
      .table_name(USERS_TABLE)
      .projection_expression(format!(
        "{USERS_TABLE_USERNAME_ATTRIBUTE}, {USERS_TABLE_PARTITION_KEY}"
      ))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let mut result = Vec::new();
    if let Some(attributes) = scan_output.items {
      for mut attribute in attributes {
        if let (Ok(username), Ok(user_id)) = (
          attribute.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE),
          attribute.take_attr(USERS_TABLE_PARTITION_KEY),
        ) {
          result.push(UserDetail { username, user_id });
        }
      }
    }
    Ok(result)
  }

  pub async fn get_all_reserved_user_details(
    &self,
  ) -> Result<Vec<UserDetail>, Error> {
    let scan_output = self
      .client
      .scan()
      .table_name(RESERVED_USERNAMES_TABLE)
      .projection_expression(format!(
        "{RESERVED_USERNAMES_TABLE_PARTITION_KEY},\
      {RESERVED_USERNAMES_TABLE_USER_ID_ATTRIBUTE}"
      ))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let mut result = Vec::new();
    if let Some(attributes) = scan_output.items {
      for mut attribute in attributes {
        if let (Ok(username), Ok(user_id)) = (
          attribute.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE),
          attribute.take_attr(RESERVED_USERNAMES_TABLE_USER_ID_ATTRIBUTE),
        ) {
          result.push(UserDetail { username, user_id });
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

    let nonce = item.take_attr(NONCE_TABLE_PARTITION_KEY)?;
    let created = DateTime::<Utc>::try_from_attr(
      NONCE_TABLE_CREATED_ATTRIBUTE,
      item.remove(NONCE_TABLE_CREATED_ATTRIBUTE),
    )?;
    let expiration_time = DateTime::<Utc>::try_from_attr(
      NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE,
      item.remove(NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE),
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
    user_details: Vec<UserDetail>,
  ) -> Result<(), Error> {
    // A single call to BatchWriteItem can consist of up to 25 operations
    for user_chunk in user_details.chunks(25) {
      let write_requests = user_chunk
        .iter()
        .map(|user_detail| {
          let put_request = PutRequest::builder()
            .item(
              RESERVED_USERNAMES_TABLE_PARTITION_KEY,
              AttributeValue::S(user_detail.username.to_string()),
            )
            .item(
              RESERVED_USERNAMES_TABLE_USER_ID_ATTRIBUTE,
              AttributeValue::S(user_detail.user_id.to_string()),
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
type Devices = HashMap<String, DeviceKeysInfo>;

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

fn parse_auth_type_attribute(
  attribute: Option<AttributeValue>,
) -> Result<AuthType, DBItemError> {
  if let Some(AttributeValue::S(auth_type)) = &attribute {
    match auth_type.as_str() {
      "password" => Ok(AuthType::Password),
      "wallet" => Ok(AuthType::Wallet),
      _ => Err(DBItemError::new(
        ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE.to_string(),
        attribute.into(),
        DBItemAttributeError::IncorrectType,
      )),
    }
  } else {
    Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE.to_string(),
      attribute.into(),
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
      attribute.into(),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE.to_string(),
      attribute.into(),
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
      attribute.into(),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE.to_string(),
      attribute.into(),
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
      attribute.into(),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      USERS_TABLE_REGISTRATION_ATTRIBUTE.to_string(),
      attribute.into(),
      DBItemAttributeError::Missing,
    )),
  }
}

#[deprecated(note = "Use `comm_lib` counterpart instead")]
#[allow(dead_code)]
fn parse_map_attribute(
  attribute_name: &str,
  attribute_value: Option<AttributeValue>,
) -> Result<AttributeMap, DBItemError> {
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
        attribute_value.into(),
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
        attribute_value.into(),
        DBItemAttributeError::Missing,
      ))
    }
  }
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
    let serialized_payload = KeyPayload::from_str(example_payload).unwrap();

    assert_eq!(
      serialized_payload
        .notification_identity_public_keys
        .curve25519,
      "DYmV8VdkjwG/VtC8C53morogNJhpTPT/4jzW0/cxzQo"
    );
  }

  #[test]
  fn test_int_to_device_type() {
    let valid_result = DeviceType::try_from(3);
    assert!(valid_result.is_ok());
    assert_eq!(valid_result.unwrap(), DeviceType::Android);

    let invalid_result = DeviceType::try_from(6);
    assert!(invalid_result.is_err());
  }
}
