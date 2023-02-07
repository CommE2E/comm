use std::collections::HashMap;
use std::fmt::{Display, Formatter, Result as FmtResult};
use std::sync::Arc;

use aws_sdk_dynamodb::error::GetItemError;
use aws_sdk_dynamodb::model::AttributeValue;
use aws_sdk_dynamodb::output::{
  DeleteItemOutput, GetItemOutput, PutItemOutput, QueryOutput, UpdateItemOutput,
};
use aws_sdk_dynamodb::types::{Blob, SdkError};
use aws_sdk_dynamodb::{Client, Error as DynamoDBError};
use aws_types::sdk_config::SdkConfig;
use chrono::{DateTime, Utc};
use opaque_ke::{errors::ProtocolError, ServerRegistration};
use tracing::{debug, error, info, warn};

use crate::constants::{
  ACCESS_TOKEN_SORT_KEY, ACCESS_TOKEN_TABLE,
  ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE, ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_PARTITION_KEY, ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE, USERS_TABLE,
  USERS_TABLE_DEVICES_ATTRIBUTE, USERS_TABLE_DEVICES_MAP_ATTRIBUTE_NAME,
  USERS_TABLE_DEVICE_ATTRIBUTE, USERS_TABLE_PARTITION_KEY,
  USERS_TABLE_REGISTRATION_ATTRIBUTE, USERS_TABLE_USERNAME_ATTRIBUTE,
  USERS_TABLE_USERNAME_INDEX, USERS_TABLE_USER_PUBLIC_KEY_ATTRIBUTE,
  USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE, USERS_TABLE_WALLET_ADDRESS_INDEX,
};
use crate::token::{AccessTokenData, AuthType};
use comm_opaque::Cipher;

#[derive(Clone)]
pub struct DatabaseClient {
  client: Arc<Client>,
}

impl DatabaseClient {
  pub fn new(aws_config: &SdkConfig) -> Self {
    DatabaseClient {
      client: Arc::new(Client::new(aws_config)),
    }
  }

  pub async fn get_pake_registration(
    &self,
    user_id: String,
  ) -> Result<Option<ServerRegistration<Cipher>>, Error> {
    match self.get_item_from_users_table(&user_id).await {
      Ok(GetItemOutput {
        item: Some(mut item),
        ..
      }) => parse_registration_data_attribute(
        item.remove(USERS_TABLE_REGISTRATION_ATTRIBUTE),
      )
      .map(Some)
      .map_err(Error::Attribute),
      Ok(_) => {
        info!(
          "No item found for user {} in PAKE registration table",
          user_id
        );
        Ok(None)
      }
      Err(e) => {
        error!(
          "DynamoDB client failed to get registration data for user {}: {}",
          user_id, e
        );
        Err(Error::AwsSdk(e.into()))
      }
    }
  }

  pub async fn update_users_table(
    &self,
    user_id: String,
    device_id: String,
    registration: Option<ServerRegistration<Cipher>>,
    username: Option<String>,
    user_public_key: Option<String>,
  ) -> Result<UpdateItemOutput, Error> {
    let mut update_expression_parts = Vec::new();
    let mut expression_attribute_names = HashMap::new();
    let mut expression_attribute_values = HashMap::new();
    if let Some(reg) = registration {
      update_expression_parts
        .push(format!("{} = :r", USERS_TABLE_REGISTRATION_ATTRIBUTE));
      expression_attribute_values.insert(
        ":r".to_string(),
        AttributeValue::B(Blob::new(reg.serialize())),
      );
    };
    if let Some(username) = username {
      update_expression_parts
        .push(format!("{} = :u", USERS_TABLE_USERNAME_ATTRIBUTE));
      expression_attribute_values
        .insert(":u".to_string(), AttributeValue::S(username));
    };
    if let Some(public_key) = user_public_key {
      update_expression_parts.push(format!(
        "{}.#{} = :k",
        USERS_TABLE_DEVICES_ATTRIBUTE, USERS_TABLE_DEVICES_MAP_ATTRIBUTE_NAME,
      ));
      expression_attribute_names.insert(
        format!("#{}", USERS_TABLE_DEVICES_MAP_ATTRIBUTE_NAME),
        device_id,
      );
      expression_attribute_values.insert(
        ":k".to_string(),
        AttributeValue::M(HashMap::from([(
          USERS_TABLE_USER_PUBLIC_KEY_ATTRIBUTE.to_string(),
          AttributeValue::S(public_key),
        )])),
      );
    };

    self
      .client
      .update_item()
      .table_name(USERS_TABLE)
      .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id))
      .update_expression(format!("SET {}", update_expression_parts.join(",")))
      .set_expression_attribute_names(
        if expression_attribute_names.is_empty() {
          None
        } else {
          Some(expression_attribute_names)
        },
      )
      .set_expression_attribute_values(
        if expression_attribute_values.is_empty() {
          None
        } else {
          Some(expression_attribute_values)
        },
      )
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))
  }

  pub async fn add_user_to_users_table(
    &self,
    user_id: String,
    device_id: String,
    registration: ServerRegistration<Cipher>,
    username: String,
    user_public_key: String,
  ) -> Result<PutItemOutput, Error> {
    let item = HashMap::from([
      (
        USERS_TABLE_PARTITION_KEY.to_string(),
        AttributeValue::S(user_id),
      ),
      (
        USERS_TABLE_USERNAME_ATTRIBUTE.to_string(),
        AttributeValue::S(username),
      ),
      (
        USERS_TABLE_REGISTRATION_ATTRIBUTE.to_string(),
        AttributeValue::B(Blob::new(registration.serialize())),
      ),
      (
        USERS_TABLE_DEVICES_ATTRIBUTE.to_string(),
        AttributeValue::M(HashMap::from([(
          device_id,
          AttributeValue::M(HashMap::from([(
            USERS_TABLE_USER_PUBLIC_KEY_ATTRIBUTE.to_string(),
            AttributeValue::S(user_public_key),
          )])),
        )])),
      ),
    ]);

    self
      .client
      .put_item()
      .table_name(USERS_TABLE)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))
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
    device_id: String,
  ) -> Result<Option<AccessTokenData>, Error> {
    let primary_key = create_composite_primary_key(
      (
        ACCESS_TOKEN_TABLE_PARTITION_KEY.to_string(),
        user_id.clone(),
      ),
      (ACCESS_TOKEN_SORT_KEY.to_string(), device_id.clone()),
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
          device_id,
          access_token,
          created,
          auth_type,
          valid,
        }))
      }
      Ok(_) => {
        info!(
          "No item found for user {} and device {} in token table",
          user_id, device_id
        );
        Ok(None)
      }
      Err(e) => {
        error!(
          "DynamoDB client failed to get token for user {} on device {}: {}",
          user_id, device_id, e
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
        AttributeValue::S(access_token_data.device_id),
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

  pub async fn get_user_id_from_user_info(
    &self,
    user_info: String,
    auth_type: AuthType,
  ) -> Result<Option<String>, Error> {
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
        items: Some(mut items),
        ..
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
        parse_string_attribute(
          USERS_TABLE_PARTITION_KEY,
          items[0].remove(USERS_TABLE_PARTITION_KEY),
        )
        .map(Some)
        .map_err(Error::Attribute)
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
          "DynamoDB client failed to get user ID from {} {}: {}",
          attribute_name, user_info, e
        );
        Err(Error::AwsSdk(e.into()))
      }
    }
  }

  pub async fn get_user_public_key(
    &self,
    user_id: String,
    device_id: String,
  ) -> Result<Option<String>, Error> {
    match self.get_item_from_users_table(&user_id).await {
      Ok(GetItemOutput {
        item: Some(mut item),
        ..
      }) => {
        // `devices` is a HashMap that maps device IDs to a HashMap of
        // device-specific attributes
        let mut devices = parse_map_attribute(
          USERS_TABLE_DEVICES_ATTRIBUTE,
          item.remove(USERS_TABLE_DEVICES_ATTRIBUTE),
        )?;
        if devices.get(&device_id).is_none() {
          return Ok(None);
        }
        let mut device = parse_map_attribute(
          USERS_TABLE_DEVICE_ATTRIBUTE,
          devices.remove(&device_id),
        )?;
        parse_string_attribute(
          USERS_TABLE_USER_PUBLIC_KEY_ATTRIBUTE,
          device.remove(USERS_TABLE_USER_PUBLIC_KEY_ATTRIBUTE),
        )
        .map(Some)
        .map_err(Error::Attribute)
      }
      Ok(_) => {
        info!(
          "No item found for user {} and device {} in users table",
          user_id, device_id
        );
        Ok(None)
      }
      Err(e) => {
        error!(
          "DynamoDB client failed to get user public key for user {}: {}",
          user_id, e
        );
        Err(Error::AwsSdk(e.into()))
      }
    }
  }

  async fn get_item_from_users_table(
    &self,
    user_id: &str,
  ) -> Result<GetItemOutput, SdkError<GetItemError>> {
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
) -> Result<ServerRegistration<Cipher>, DBItemError> {
  match &attribute {
    Some(AttributeValue::B(server_registration_bytes)) => {
      match ServerRegistration::<Cipher>::deserialize(
        server_registration_bytes.as_ref(),
      ) {
        Ok(server_registration) => Ok(server_registration),
        Err(e) => Err(DBItemError::new(
          USERS_TABLE_REGISTRATION_ATTRIBUTE,
          attribute,
          DBItemAttributeError::Pake(e),
        )),
      }
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

fn parse_map_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<HashMap<String, AttributeValue>, DBItemError> {
  match attribute_value {
    Some(AttributeValue::M(value)) => Ok(value),
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
}
