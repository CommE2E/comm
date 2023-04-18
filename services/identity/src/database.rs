use std::collections::HashMap;
use std::fmt::{Display, Formatter, Result as FmtResult};
use std::str::FromStr;
use std::sync::Arc;

use aws_config::SdkConfig;
use aws_sdk_dynamodb::model::AttributeValue;
use aws_sdk_dynamodb::output::{
  DeleteItemOutput, GetItemOutput, PutItemOutput, QueryOutput,
};
use aws_sdk_dynamodb::types::Blob;
use aws_sdk_dynamodb::{Client, Error as DynamoDBError};
use chrono::{DateTime, Utc};
use opaque_ke::{errors::ProtocolError, ServerRegistration};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

use crate::client_service::RegistrationState;
use crate::config::CONFIG;
use crate::constants::{
  ACCESS_TOKEN_SORT_KEY, ACCESS_TOKEN_TABLE,
  ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE, ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_PARTITION_KEY, ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE, NONCE_TABLE,
  NONCE_TABLE_CREATED_ATTRIBUTE, NONCE_TABLE_PARTITION_KEY, USERS_TABLE,
  USERS_TABLE_DEVICES_ATTRIBUTE,
  USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_IDENTITY_ONETIME_KEYS_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_IDENTITY_PREKEY_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_IDENTITY_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_NOTIF_ONETIME_KEYS_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME,
  USERS_TABLE_PARTITION_KEY, USERS_TABLE_REGISTRATION_ATTRIBUTE,
  USERS_TABLE_USERNAME_ATTRIBUTE, USERS_TABLE_USERNAME_INDEX,
  USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE, USERS_TABLE_WALLET_ADDRESS_INDEX,
};
use crate::nonce::NonceData;
use crate::token::{AccessTokenData, AuthType};
use crate::utils::generate_uuid;
use comm_opaque::Cipher;

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

pub enum Device {
  Client,
  Keyserver,
}

impl Display for Device {
  fn fmt(&self, f: &mut Formatter) -> FmtResult {
    match self {
      Device::Client => write!(f, "client"),
      Device::Keyserver => write!(f, "keyserver"),
    }
  }
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

  pub async fn add_user_to_users_table(
    &self,
    registration_state: RegistrationState,
    password_file: Vec<u8>,
  ) -> Result<String, Error> {
    let user_id = generate_uuid();
    let device_info = HashMap::from([
      (
        USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME.to_string(),
        AttributeValue::S(Device::Client.to_string()),
      ),
      (
        USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME.to_string(),
        AttributeValue::S(
          registration_state.flattened_device_key_upload.key_payload,
        ),
      ),
      (
        USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME
          .to_string(),
        AttributeValue::S(
          registration_state
            .flattened_device_key_upload
            .key_payload_signature,
        ),
      ),
      (
        USERS_TABLE_DEVICES_MAP_IDENTITY_PREKEY_ATTRIBUTE_NAME.to_string(),
        AttributeValue::S(
          registration_state
            .flattened_device_key_upload
            .identity_prekey,
        ),
      ),
      (
        USERS_TABLE_DEVICES_MAP_IDENTITY_PREKEY_SIGNATURE_ATTRIBUTE_NAME
          .to_string(),
        AttributeValue::S(
          registration_state
            .flattened_device_key_upload
            .identity_prekey_signature,
        ),
      ),
      (
        USERS_TABLE_DEVICES_MAP_IDENTITY_ONETIME_KEYS_ATTRIBUTE_NAME
          .to_string(),
        AttributeValue::L(
          registration_state
            .flattened_device_key_upload
            .identity_onetime_keys
            .into_iter()
            .map(AttributeValue::S)
            .collect(),
        ),
      ),
      (
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME.to_string(),
        AttributeValue::S(
          registration_state.flattened_device_key_upload.notif_prekey,
        ),
      ),
      (
        USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME
          .to_string(),
        AttributeValue::S(
          registration_state
            .flattened_device_key_upload
            .notif_prekey_signature,
        ),
      ),
      (
        USERS_TABLE_DEVICES_MAP_NOTIF_ONETIME_KEYS_ATTRIBUTE_NAME.to_string(),
        AttributeValue::L(
          registration_state
            .flattened_device_key_upload
            .notif_onetime_keys
            .into_iter()
            .map(AttributeValue::S)
            .collect(),
        ),
      ),
    ]);
    let devices = HashMap::from([(
      registration_state.flattened_device_key_upload.device_id_key,
      AttributeValue::M(device_info),
    )]);

    let user = HashMap::from([
      (
        USERS_TABLE_PARTITION_KEY.to_string(),
        AttributeValue::S(user_id.clone()),
      ),
      (
        USERS_TABLE_USERNAME_ATTRIBUTE.to_string(),
        AttributeValue::S(registration_state.username),
      ),
      (
        USERS_TABLE_DEVICES_ATTRIBUTE.to_string(),
        AttributeValue::M(devices),
      ),
      (
        USERS_TABLE_REGISTRATION_ATTRIBUTE.to_string(),
        AttributeValue::B(Blob::new(password_file)),
      ),
    ]);

    self
      .client
      .put_item()
      .table_name(USERS_TABLE)
      .set_item(Some(user))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    Ok(user_id)
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
        let created = parse_created_attribute(
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

  pub async fn username_taken(&self, username: String) -> Result<bool, Error> {
    let result = self
      .get_user_id_from_user_info(username, AuthType::Password)
      .await?;

    Ok(result.is_some())
  }

  async fn get_user_from_user_info(
    &self,
    user_info: String,
    auth_type: AuthType,
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
        Ok(Some(first_item))
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

  pub async fn get_user_id_from_user_info(
    &self,
    user_info: String,
    auth_type: AuthType,
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

  pub async fn get_password_file_from_username(
    &self,
    username: &str,
  ) -> Result<Option<Vec<u8>>, Error> {
    match self
      .get_user_from_user_info(username.to_string(), AuthType::Password)
      .await
    {
      Ok(Some(mut user)) => parse_registration_data_attribute(
        user.remove(USERS_TABLE_REGISTRATION_ATTRIBUTE),
      )
      .map(Some)
      .map_err(Error::Attribute),
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

  pub async fn get_users(&self) -> Result<Vec<String>, Error> {
    let scan_output = self
      .client
      .scan()
      .table_name(USERS_TABLE)
      .projection_expression(USERS_TABLE_PARTITION_KEY)
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let mut result = Vec::new();
    if let Some(attributes) = scan_output.items {
      for mut attribute in attributes {
        let id = parse_string_attribute(
          USERS_TABLE_PARTITION_KEY,
          attribute.remove(USERS_TABLE_PARTITION_KEY),
        )
        .map_err(Error::Attribute)?;
        result.push(id);
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
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(DynamoDBError),
  #[display(...)]
  Attribute(DBItemError),
}

#[derive(Debug, derive_more::Error, derive_more::Constructor)]
pub struct DBItemError {
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
  attribute_error: DBItemAttributeError,
}

impl Display for DBItemError {
  fn fmt(&self, f: &mut Formatter) -> FmtResult {
    match &self.attribute_error {
      DBItemAttributeError::Missing => {
        write!(f, "Attribute {} is missing", self.attribute_name)
      }
      DBItemAttributeError::IncorrectType => write!(
        f,
        "Value for attribute {} has incorrect type: {:?}",
        self.attribute_name, self.attribute_value
      ),
      error => write!(
        f,
        "Error regarding attribute {} with value {:?}: {}",
        self.attribute_name, self.attribute_value, error
      ),
    }
  }
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum DBItemAttributeError {
  #[display(...)]
  Missing,
  #[display(...)]
  IncorrectType,
  #[display(...)]
  InvalidTimestamp(chrono::ParseError),
  #[display(...)]
  Pake(ProtocolError),
}

type AttributeName = String;

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

fn parse_created_attribute(
  attribute: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  if let Some(AttributeValue::S(created)) = &attribute {
    created.parse().map_err(|e| {
      DBItemError::new(
        ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE,
        attribute,
        DBItemAttributeError::InvalidTimestamp(e),
      )
    })
  } else {
    Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE,
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
        ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE,
        attribute,
        DBItemAttributeError::IncorrectType,
      )),
    }
  } else {
    Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE,
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
      ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE,
      attribute,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE,
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
      ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE,
      attribute,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE,
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
      USERS_TABLE_REGISTRATION_ATTRIBUTE,
      attribute,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      USERS_TABLE_REGISTRATION_ATTRIBUTE,
      attribute,
      DBItemAttributeError::Missing,
    )),
  }
}

fn parse_map_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<HashMap<String, AttributeValue>, DBItemError> {
  match attribute_value {
    Some(AttributeValue::M(map)) => Ok(map),
    Some(_) => Err(DBItemError::new(
      attribute_name,
      attribute_value,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      attribute_name,
      attribute_value,
      DBItemAttributeError::Missing,
    )),
  }
}

fn parse_string_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<String, DBItemError> {
  match attribute_value {
    Some(AttributeValue::S(value)) => Ok(value),
    Some(_) => Err(DBItemError::new(
      attribute_name,
      attribute_value,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      attribute_name,
      attribute_value,
      DBItemAttributeError::Missing,
    )),
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
    let serialized_payload = KeyPayload::from_str(&example_payload).unwrap();

    assert_eq!(
      serialized_payload
        .notification_identity_public_keys
        .curve25519,
      "DYmV8VdkjwG/VtC8C53morogNJhpTPT/4jzW0/cxzQo"
    );
  }
}
