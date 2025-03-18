use comm_lib::aws::ddb::{
  operation::{
    delete_item::DeleteItemOutput, get_item::GetItemOutput,
    put_item::PutItemOutput, query::QueryOutput,
  },
  primitives::Blob,
  types::{
    AttributeValue, Delete, Put, PutRequest, TransactWriteItem, WriteRequest,
  },
};
use comm_lib::aws::{AwsConfig, DynamoDBClient};
use comm_lib::database::{
  AttributeExtractor, AttributeMap, DBItemAttributeError, DBItemError,
  TryFromAttribute,
};
use comm_lib::tools::IntoChunks;
use std::collections::{HashMap, HashSet};
use std::str::FromStr;
use std::sync::Arc;

pub use crate::database::device_list::DeviceIDAttribute;
pub use crate::database::one_time_keys::OTKRow;
use crate::{
  constants::{tonic_status_messages, RESERVED_USERNAMES_TABLE_USER_ID_INDEX},
  ddb_utils::EthereumIdentity,
  device_list::SignedDeviceList,
  grpc_services::shared::PlatformMetadata,
  log::redact_sensitive_data,
  reserved_users::UserDetail,
  siwe::SocialProof,
};
use crate::{
  ddb_utils::{DBIdentity, OlmAccountType},
  grpc_services::protos,
};
use crate::{error::Error, grpc_utils::DeviceKeysInfo};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn, Instrument};

use crate::client_service::{FlattenedDeviceKeyUpload, UserRegistrationInfo};
use crate::constants::{
  error_types, NONCE_TABLE, NONCE_TABLE_CREATED_ATTRIBUTE,
  NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE,
  NONCE_TABLE_EXPIRATION_TIME_UNIX_ATTRIBUTE, NONCE_TABLE_PARTITION_KEY,
  RESERVED_USERNAMES_TABLE, RESERVED_USERNAMES_TABLE_PARTITION_KEY,
  RESERVED_USERNAMES_TABLE_USERNAME_LOWER_ATTRIBUTE,
  RESERVED_USERNAMES_TABLE_USERNAME_LOWER_INDEX,
  RESERVED_USERNAMES_TABLE_USER_ID_ATTRIBUTE, USERS_TABLE,
  USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME,
  USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME, USERS_TABLE_PARTITION_KEY,
  USERS_TABLE_REGISTRATION_ATTRIBUTE, USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME,
  USERS_TABLE_USERNAME_ATTRIBUTE, USERS_TABLE_USERNAME_LOWER_ATTRIBUTE_NAME,
  USERS_TABLE_USERNAME_LOWER_INDEX, USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
  USERS_TABLE_WALLET_ADDRESS_INDEX,
};
use crate::id::generate_uuid;
use crate::nonce::NonceData;
use crate::token::AuthType;
pub use grpc_clients::identity::DeviceType;

mod device_list;
mod farcaster;
mod one_time_keys;
mod token;
mod workflows;
pub use device_list::{
  DeviceListRow, DeviceListUpdate, DeviceRow, PlatformDetails, Prekey,
};

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
      }),
      content_prekey: Some(db_keys.content_prekey.into()),
      notif_prekey: Some(db_keys.notif_prekey.into()),
      one_time_content_prekey: db_keys.content_one_time_key,
      one_time_notif_prekey: db_keys.notif_one_time_key,
    }
  }
}

pub struct UserInfoAndPasswordFile {
  pub user_id: String,
  pub original_username: String,
  pub password_file: Vec<u8>,
}

#[derive(Clone)]
pub struct DatabaseClient {
  client: Arc<DynamoDBClient>,
}

impl DatabaseClient {
  pub fn new(aws_config: &AwsConfig) -> Self {
    let client = DynamoDBClient::new(aws_config);
    DatabaseClient {
      client: Arc::new(client),
    }
  }

  pub async fn add_password_user_to_users_table(
    &self,
    registration_state: UserRegistrationInfo,
    password_file: Vec<u8>,
    platform_details: PlatformMetadata,
    access_token_creation_time: DateTime<Utc>,
  ) -> Result<String, Error> {
    let device_key_upload = registration_state.flattened_device_key_upload;
    let user_id = self
      .add_user_to_users_table(
        Some((registration_state.username, Blob::new(password_file))),
        None,
        registration_state.user_id,
        registration_state.farcaster_id,
      )
      .await?;

    // When initial device list is present, we should apply it
    // instead of auto-creating one.
    if let Some(device_list) = registration_state.initial_device_list {
      let initial_device_list = DeviceListUpdate::try_from(device_list)?;
      self
        .register_primary_device(
          &user_id,
          device_key_upload.clone(),
          platform_details,
          access_token_creation_time,
          initial_device_list,
          None,
        )
        .await?;
    } else {
      self
        .add_device(
          &user_id,
          device_key_upload.clone(),
          platform_details,
          access_token_creation_time,
        )
        .await?;
    }

    self
      .append_one_time_prekeys(
        &user_id,
        &device_key_upload.device_id_key,
        &device_key_upload.content_one_time_keys,
        &device_key_upload.notif_one_time_keys,
      )
      .await?;

    Ok(user_id)
  }

  #[allow(clippy::too_many_arguments)]
  pub async fn add_wallet_user_to_users_table(
    &self,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
    wallet_address: String,
    social_proof: SocialProof,
    user_id: Option<String>,
    platform_metadata: PlatformMetadata,
    access_token_creation_time: DateTime<Utc>,
    farcaster_id: Option<String>,
    initial_device_list: Option<SignedDeviceList>,
  ) -> Result<String, Error> {
    let wallet_identity = EthereumIdentity {
      wallet_address: wallet_address.clone(),
      social_proof,
    };
    let user_id = self
      .add_user_to_users_table(
        None,
        Some(wallet_identity),
        user_id,
        farcaster_id,
      )
      .await?;

    // When initial device list is present, we should apply it
    // instead of auto-creating one.
    if let Some(device_list) = initial_device_list {
      let initial_device_list = DeviceListUpdate::try_from(device_list)?;
      self
        .register_primary_device(
          &user_id,
          flattened_device_key_upload.clone(),
          platform_metadata,
          access_token_creation_time,
          initial_device_list,
          None,
        )
        .await?;
    } else {
      self
        .add_device(
          &user_id,
          flattened_device_key_upload.clone(),
          platform_metadata,
          access_token_creation_time,
        )
        .await?;
    }

    self
      .append_one_time_prekeys(
        &user_id,
        &flattened_device_key_upload.device_id_key,
        &flattened_device_key_upload.content_one_time_keys,
        &flattened_device_key_upload.notif_one_time_keys,
      )
      .await?;

    Ok(user_id)
  }

  async fn add_user_to_users_table(
    &self,
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

    if let Some((username, password_file)) = username_and_password_file.clone()
    {
      user.insert(
        USERS_TABLE_USERNAME_ATTRIBUTE.to_string(),
        AttributeValue::S(username.clone()),
      );
      user.insert(
        USERS_TABLE_REGISTRATION_ATTRIBUTE.to_string(),
        AttributeValue::B(password_file),
      );
      user.insert(
        USERS_TABLE_USERNAME_LOWER_ATTRIBUTE_NAME.to_string(),
        AttributeValue::S(username.to_lowercase()),
      );
    }

    if let Some(eth_identity) = wallet_identity.clone() {
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

    let put_user = Put::builder()
      .table_name(USERS_TABLE)
      .set_item(Some(user))
      // make sure we don't accidentally overwrite existing row
      .condition_expression("attribute_not_exists(#pk)")
      .expression_attribute_names("#pk", USERS_TABLE_PARTITION_KEY)
      .build()
      .expect("key, update_expression or table_name not set in Update builder");

    let put_user_operation = TransactWriteItem::builder().put(put_user).build();

    let partition_key_value =
      match (username_and_password_file, wallet_identity) {
        (Some((username, _)), _) => username,
        (_, Some(ethereum_identity)) => ethereum_identity.wallet_address,
        _ => return Err(Error::MalformedItem),
      };

    // We make sure to delete the user from the reserved usernames table when we
    // add them to the users table
    let delete_user_from_reserved_usernames = Delete::builder()
      .table_name(RESERVED_USERNAMES_TABLE)
      .key(
        RESERVED_USERNAMES_TABLE_PARTITION_KEY,
        AttributeValue::S(partition_key_value),
      )
      .build()
      .expect("key or table_name not set in Delete builder");

    let delete_user_from_reserved_usernames_operation =
      TransactWriteItem::builder()
        .delete(delete_user_from_reserved_usernames)
        .build();

    self
      .client
      .transact_write_items()
      .set_transact_items(Some(vec![
        put_user_operation,
        delete_user_from_reserved_usernames_operation,
      ]))
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::GENERIC_DB_LOG,
          "Add user transaction failed: {:?}", e
        );
        Error::AwsSdk(e.into())
      })?;

    Ok(user_id)
  }

  pub async fn add_user_device(
    &self,
    user_id: String,
    flattened_device_key_upload: FlattenedDeviceKeyUpload,
    platform_metadata: PlatformMetadata,
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
        &user_id,
        flattened_device_key_upload,
        platform_metadata,
        access_token_creation_time,
      )
      .await?;

    self
      .append_one_time_prekeys(
        &user_id,
        &device_id,
        &content_one_time_keys,
        &notif_one_time_keys,
      )
      .await?;

    Ok(())
  }

  pub async fn update_wallet_user_social_proof(
    &self,
    user_id: &str,
    social_proof: SocialProof,
  ) -> Result<(), Error> {
    self
      .client
      .update_item()
      .table_name(USERS_TABLE)
      .key(
        USERS_TABLE_PARTITION_KEY,
        AttributeValue::S(user_id.to_string()),
      )
      .update_expression("SET #social_proof = :v")
      .condition_expression("attribute_exists(#social_proof)")
      .expression_attribute_names(
        "#social_proof",
        USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME,
      )
      .expression_attribute_values(":v", social_proof.into())
      .send()
      .await
      .map_err(|e| {
        // ConditionalCheckFailedException means we're updating
        // non-wallet user (DB item without social proof)
        error!(
          errorType = error_types::GENERIC_DB_LOG,
          "DynamoDB client failed to update social proof: {:?}", e
        );
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn get_keyserver_keys_for_user(
    &self,
    user_id: &str,
  ) -> Result<Option<OutboundKeys>, Error> {
    use crate::grpc_services::protos::unauth::DeviceType as GrpcDeviceType;

    let user_devices = self.get_current_devices(user_id).await?;
    let maybe_keyserver_device = user_devices
      .into_iter()
      .find(|device| *device.device_type() == GrpcDeviceType::Keyserver);

    let Some(keyserver) = maybe_keyserver_device else {
      return Ok(None);
    };
    debug!(
      "Found keyserver in devices table (ID={})",
      &keyserver.device_id
    );

    let (notif_one_time_key, requested_more_keys) = self
      .get_one_time_key(
        user_id,
        &keyserver.device_id,
        OlmAccountType::Notification,
        true,
      )
      .await
      .unwrap_or_else(|e| {
        error!(
          errorType = error_types::OTK_DB_LOG,
          "Error retrieving notification one-time key: {:?}", e
        );
        (None, true)
      });
    let (content_one_time_key, _) = self
      .get_one_time_key(
        user_id,
        &keyserver.device_id,
        OlmAccountType::Content,
        !requested_more_keys,
      )
      .await
      .unwrap_or_else(|e| {
        error!(
          errorType = error_types::OTK_DB_LOG,
          "Error retrieving content one-time key: {:?}", e
        );
        (None, true)
      });

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
      .find(|device| *device.device_type() == GrpcDeviceType::Keyserver)
      .map(|device| device.device_id);

    Ok(maybe_keyserver_device_id)
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

  /// Deletes all user data from DynamoDB. Returns device IDs
  /// from user's device list.
  #[tracing::instrument(skip_all)]
  pub async fn delete_user(&self, user_id: String) -> Result<(), Error> {
    // We must delete the one-time keys first because doing so requires device
    // IDs from the devices table
    debug!(user_id, "Attempting to delete user's one-time keys");
    self.delete_otks_table_rows_for_user(&user_id).await?;

    debug!(user_id, "Attempting to delete user's devices");
    self.delete_devices_table_rows_for_user(&user_id).await?;

    debug!(user_id, "Attempting to delete user's access tokens");
    self.delete_all_tokens_for_user(&user_id).await?;

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
        error!(
          errorType = error_types::GENERIC_DB_LOG,
          "DynamoDB client failed to delete user {}", user_id
        );
        Err(Error::AwsSdk(e.into()))
      }
    }?;

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
    let username_lower = username.to_lowercase();

    let request = self
      .client
      .query()
      .table_name(USERS_TABLE)
      .index_name(USERS_TABLE_USERNAME_LOWER_INDEX)
      .key_condition_expression("#username_lower = :username_lower")
      .expression_attribute_names(
        "#username_lower",
        USERS_TABLE_USERNAME_LOWER_ATTRIBUTE_NAME,
      )
      .expression_attribute_values(
        ":username_lower",
        AttributeValue::S(username_lower),
      );

    let response = request.send().await.map_err(|e| {
      error!(
        errorType = error_types::GENERIC_DB_LOG,
        "Failed to query lowercase usernames by index: {:?}", e
      );
      Error::AwsSdk(e.into())
    })?;

    let username_available = response.items().is_empty();
    Ok(!username_available)
  }

  pub async fn filter_out_taken_usernames(
    &self,
    user_details: Vec<UserDetail>,
  ) -> Result<Vec<UserDetail>, Error> {
    let db_usernames = self.get_all_usernames().await?;

    let db_usernames_set: HashSet<String> = db_usernames
      .into_iter()
      .map(|username| username.to_lowercase())
      .collect();

    let available_user_details: Vec<UserDetail> = user_details
      .into_iter()
      .filter(|user_detail| {
        !db_usernames_set.contains(&user_detail.username.to_lowercase())
      })
      .collect();

    Ok(available_user_details)
  }

  #[tracing::instrument(skip_all)]
  async fn get_user_from_user_info(
    &self,
    user_info: String,
    auth_type: &AuthType,
  ) -> Result<Option<HashMap<String, AttributeValue>>, Error> {
    let (index, attribute_name, attribute_value) = match auth_type {
      AuthType::Password => (
        USERS_TABLE_USERNAME_LOWER_INDEX,
        USERS_TABLE_USERNAME_LOWER_ATTRIBUTE_NAME,
        user_info.to_lowercase(),
      ),
      AuthType::Wallet => (
        USERS_TABLE_WALLET_ADDRESS_INDEX,
        USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
        user_info.clone(),
      ),
    };
    match self
      .client
      .query()
      .table_name(USERS_TABLE)
      .index_name(index)
      .key_condition_expression(format!("{} = :u", attribute_name))
      .expression_attribute_values(":u", AttributeValue::S(attribute_value))
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
          errorType = error_types::GENERIC_DB_LOG,
          "DynamoDB client failed to get user from {} {}: {}",
          attribute_name,
          user_info,
          e
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
        let requested_more_keys;
        (device_keys.notif_one_time_key, requested_more_keys) = self
          .get_one_time_key(
            user_id,
            device_id_key,
            OlmAccountType::Notification,
            true,
          )
          .await
          .unwrap_or_else(|e| {
            error!(
              errorType = error_types::OTK_DB_LOG,
              "Error retrieving notification one-time key: {:?}", e
            );
            (None, true)
          });
        (device_keys.content_one_time_key, _) = self
          .get_one_time_key(
            user_id,
            device_id_key,
            OlmAccountType::Content,
            !requested_more_keys,
          )
          .await
          .unwrap_or_else(|e| {
            error!(
              errorType = error_types::OTK_DB_LOG,
              "Error retrieving content one-time key: {:?}", e
            );
            (None, true)
          });
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

  #[tracing::instrument(skip_all)]
  pub async fn get_user_info_and_password_file_from_username(
    &self,
    username: &str,
  ) -> Result<Option<UserInfoAndPasswordFile>, Error> {
    match self
      .get_user_from_user_info(username.to_string(), &AuthType::Password)
      .await
    {
      Ok(Some(mut user)) => {
        let user_id = user.take_attr(USERS_TABLE_PARTITION_KEY)?;
        let password_file = parse_registration_data_attribute(
          user.remove(USERS_TABLE_REGISTRATION_ATTRIBUTE),
        )?;
        let original_username =
          user.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE)?;

        Ok(Some(UserInfoAndPasswordFile {
          user_id,
          original_username,
          password_file,
        }))
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
          errorType = error_types::GENERIC_DB_LOG,
          "DynamoDB client failed to get registration data for user {}: {}",
          username,
          e
        );
        Err(e)
      }
    }
  }

  pub async fn get_username_and_password_file(
    &self,
    user_id: &str,
  ) -> Result<Option<(String, Vec<u8>)>, Error> {
    let Some(mut user) = self.get_item_from_users_table(user_id).await?.item
    else {
      return Ok(None);
    };
    let username = user.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE)?;
    let password_file = parse_registration_data_attribute(
      user.remove(USERS_TABLE_REGISTRATION_ATTRIBUTE),
    )?;
    Ok(Some((username, password_file)))
  }

  /// Returns an error if `user_id` does not exist in users table
  pub async fn user_is_password_authenticated(
    &self,
    user_id: &str,
  ) -> Result<bool, Error> {
    let Some(user_item) = self.get_item_from_users_table(user_id).await?.item
    else {
      error!(errorType = error_types::GENERIC_DB_LOG, "user not found");
      return Err(Error::MissingItem);
    };
    Ok(user_item.contains_key(USERS_TABLE_REGISTRATION_ATTRIBUTE))
  }

  async fn get_item_from_users_table(
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

  pub async fn find_db_user_identities(
    &self,
    user_ids: impl IntoIterator<Item = String>,
  ) -> Result<HashMap<String, DBIdentity>, Error> {
    use comm_lib::database::batch_operations::{
      batch_get, ExponentialBackoffConfig,
    };
    let primary_keys = user_ids.into_iter().map(|user_id| {
      create_simple_primary_key((
        USERS_TABLE_PARTITION_KEY.to_string(),
        user_id,
      ))
    });
    let projection_expression = [
      USERS_TABLE_PARTITION_KEY,
      USERS_TABLE_USERNAME_ATTRIBUTE,
      USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
      USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME,
      USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME,
    ]
    .join(", ");
    debug!(
      num_requests = primary_keys.size_hint().0,
      "Attempting to batch get user identifiers"
    );

    let responses = batch_get(
      &self.client,
      USERS_TABLE,
      primary_keys,
      Some(projection_expression),
      ExponentialBackoffConfig::default(),
    )
    .await
    .map_err(Error::from)?;
    debug!("Found {} matching user identifiers in DDB", responses.len());

    let mut results = HashMap::with_capacity(responses.len());
    for response in responses {
      let user_id = response.get_attr(USERS_TABLE_PARTITION_KEY)?;
      // if this fails, it means that projection expression didnt have all attrs it needed
      let identity = DBIdentity::try_from(response)?;
      results.insert(user_id, identity);
    }

    Ok(results)
  }

  /// Retrieves username for password users or wallet address for wallet users
  /// Returns `None` if user not found
  #[tracing::instrument(skip_all)]
  pub async fn get_user_identity(
    &self,
    user_id: &str,
  ) -> Result<Option<DBIdentity>, Error> {
    self
      .get_item_from_users_table(user_id)
      .await?
      .item
      .map(DBIdentity::try_from)
      .transpose()
      .map_err(|e| {
        error!(
          user_id = redact_sensitive_data(user_id),
          errorType = error_types::GENERIC_DB_LOG,
          "Database item is missing an identifier"
        );
        e
      })
  }

  /// Returns all usernames and wallet addresses from `identity-users` table
  async fn get_all_usernames(&self) -> Result<Vec<String>, Error> {
    let scan_output = self
      .client
      .scan()
      .table_name(USERS_TABLE)
      .projection_expression("#username, #walletAddress")
      .expression_attribute_names("#username", USERS_TABLE_USERNAME_ATTRIBUTE)
      .expression_attribute_names(
        "#walletAddress",
        USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
      )
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let mut result = Vec::new();
    if let Some(items) = scan_output.items {
      for mut item in items {
        if let Ok(username) = item.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE) {
          result.push(username);
        } else if let Ok(wallet_address) =
          item.take_attr(USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE)
        {
          result.push(wallet_address);
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
      .projection_expression("#userID, #username, #walletAddress")
      .expression_attribute_names("#userID", USERS_TABLE_PARTITION_KEY)
      .expression_attribute_names("#username", USERS_TABLE_USERNAME_ATTRIBUTE)
      .expression_attribute_names(
        "#walletAddress",
        USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
      )
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let mut result = Vec::new();

    let Some(items) = scan_output.items else {
      return Ok(result);
    };

    for mut item in items {
      let Ok(user_id) = item.take_attr(USERS_TABLE_PARTITION_KEY) else {
        error!(
          errorType = error_types::GENERIC_DB_LOG,
          "Partition key missing for item"
        );
        continue;
      };
      if let Ok(username) = item.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE) {
        result.push(UserDetail { username, user_id });
      } else if let Ok(wallet_address) =
        item.take_attr(USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE)
      {
        result.push(UserDetail {
          username: wallet_address,
          user_id,
        })
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
            .item(
              RESERVED_USERNAMES_TABLE_USERNAME_LOWER_ATTRIBUTE,
              AttributeValue::S(user_detail.username.to_lowercase()),
            )
            .build()
            .expect("no items set in PutRequest builder");

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

  #[tracing::instrument(skip_all)]
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
        error!(errorType = error_types::GENERIC_DB_LOG, "DynamoDB client failed to delete username {} from reserved usernames table", username);
        Err(Error::AwsSdk(e.into()))
      }
    }
  }

  pub async fn get_user_id_from_reserved_usernames_table(
    &self,
    username: &str,
  ) -> Result<Option<String>, Error> {
    self
      .query_reserved_usernames_table(
        username,
        RESERVED_USERNAMES_TABLE_USER_ID_ATTRIBUTE,
      )
      .await
  }

  pub async fn get_original_username_from_reserved_usernames_table(
    &self,
    username: &str,
  ) -> Result<Option<String>, Error> {
    self
      .query_reserved_usernames_table(
        username,
        RESERVED_USERNAMES_TABLE_PARTITION_KEY,
      )
      .await
  }

  async fn query_reserved_usernames_table(
    &self,
    username: &str,
    attribute: &str,
  ) -> Result<Option<String>, Error> {
    let username_lower = username.to_lowercase();

    self
      .query_reserved_usernames_table_index(
        &username_lower,
        (
          RESERVED_USERNAMES_TABLE_USERNAME_LOWER_INDEX,
          RESERVED_USERNAMES_TABLE_USERNAME_LOWER_ATTRIBUTE,
        ),
        attribute,
      )
      .await
  }

  #[tracing::instrument(skip_all)]
  pub async fn query_reserved_usernames_by_user_ids(
    &self,
    user_ids: Vec<String>,
  ) -> Result<HashMap<String, String>, Error> {
    debug!("Querying for {} reserved usernames", user_ids.len());

    const NUM_CONCURRENT_TASKS: usize = 16;

    let mut tasks = tokio::task::JoinSet::new();
    let mut results = HashMap::with_capacity(user_ids.len());
    for local_user_ids in user_ids.into_n_chunks(NUM_CONCURRENT_TASKS) {
      let db = self.clone();
      let task = async move {
        let mut local_results = HashMap::new();
        for user_id in local_user_ids {
          let query_result = db
            .query_reserved_usernames_table_index(
              &user_id,
              (
                RESERVED_USERNAMES_TABLE_USER_ID_INDEX,
                RESERVED_USERNAMES_TABLE_USER_ID_ATTRIBUTE,
              ),
              RESERVED_USERNAMES_TABLE_PARTITION_KEY,
            )
            .await?;

          if let Some(username) = query_result {
            local_results.insert(user_id, username);
          }
        }

        Ok::<_, Error>(local_results)
      };
      tasks.spawn(task.in_current_span());
    }

    while let Some(result) = tasks.join_next().await {
      match result {
        Ok(Ok(task_result)) => {
          results.extend(task_result);
        }
        Ok(Err(query_error)) => {
          error!(
            errorType = error_types::GENERIC_DB_LOG,
            "Failed to query reserved usernames by userID: {:?}", query_error
          );
          tasks.abort_all();
          return Err(query_error);
        }
        Err(join_error) => {
          error!(
            errorType = error_types::GENERIC_DB_LOG,
            "Failed to join task: {:?}", join_error
          );
          tasks.abort_all();
          return Err(Error::Status(tonic::Status::aborted(
            tonic_status_messages::UNEXPECTED_ERROR,
          )));
        }
      }
    }

    Ok(results)
  }

  async fn query_reserved_usernames_table_index(
    &self,
    key_value: impl Into<String>,
    // tuple of (index name, key attribute)
    index_and_key: (&'static str, &'static str),
    attribute: &str,
  ) -> Result<Option<String>, Error> {
    let (index, key_attr) = index_and_key;
    let response = self
      .client
      .query()
      .table_name(RESERVED_USERNAMES_TABLE)
      .index_name(index)
      .key_condition_expression("#key_name = :key_value")
      .expression_attribute_names("#key_name", key_attr)
      .expression_attribute_values(
        ":key_value",
        AttributeValue::S(key_value.into()),
      )
      .limit(1)
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let QueryOutput {
      items: Some(mut results),
      ..
    } = response
    else {
      return Ok(None);
    };

    let result = results
      .pop()
      .map(|mut attrs| attrs.take_attr::<String>(attribute))
      .transpose()?;

    Ok(result)
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
          errorType = error_types::GENERIC_DB_LOG, "Unexpected attribute type when parsing map attribute"
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
        errorType = error_types::GENERIC_DB_LOG,
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
