use std::collections::HashMap;
use std::fmt::{Display, Formatter, Result as FmtResult};

use bytes::Bytes;
use chrono::{DateTime, Utc};
use opaque_ke::{errors::ProtocolError, ServerRegistration};
use rusoto_core::{Region, RusotoError};
use rusoto_dynamodb::{
  AttributeValue, DynamoDb, DynamoDbClient, GetItemError, GetItemInput,
  GetItemOutput, PutItemError, PutItemInput, PutItemOutput,
};
use tracing::{error, info};

use crate::constants::{
  ACCESS_TOKEN_SORT_KEY, ACCESS_TOKEN_TABLE,
  ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE, ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_PARTITION_KEY, ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE,
  ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE, PAKE_REGISTRATION_TABLE,
  PAKE_REGISTRATION_TABLE_DATA_ATTRIBUTE,
  PAKE_REGISTRATION_TABLE_PARTITION_KEY,
};
use crate::opaque::Cipher;
use crate::token::{AccessTokenData, AuthType};

#[derive(Clone)]
pub struct DatabaseClient {
  client: DynamoDbClient,
}

impl DatabaseClient {
  pub fn new(region: Region) -> Self {
    DatabaseClient {
      client: DynamoDbClient::new(region),
    }
  }

  pub async fn get_pake_registration(
    &self,
    user_id: String,
  ) -> Result<Option<ServerRegistration<Cipher>>, Error> {
    let primary_key = create_simple_primary_key((
      PAKE_REGISTRATION_TABLE_PARTITION_KEY.to_string(),
      user_id.clone(),
    ));
    let get_item_input = GetItemInput {
      table_name: PAKE_REGISTRATION_TABLE.to_string(),
      key: primary_key,
      consistent_read: Some(true),
      ..GetItemInput::default()
    };
    let get_item_result = self.client.get_item(get_item_input).await;
    match get_item_result {
      Ok(GetItemOutput {
        item: Some(mut item),
        ..
      }) => parse_registration_data_attribute(
        item.remove(PAKE_REGISTRATION_TABLE_DATA_ATTRIBUTE),
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
        Err(Error::RusotoGet(e))
      }
    }
  }

  pub async fn put_pake_registration(
    &self,
    user_id: String,
    registration: ServerRegistration<Cipher>,
  ) -> Result<PutItemOutput, RusotoError<PutItemError>> {
    let input = PutItemInput {
      table_name: PAKE_REGISTRATION_TABLE.to_string(),
      item: HashMap::from([
        (
          PAKE_REGISTRATION_TABLE_PARTITION_KEY.to_string(),
          AttributeValue {
            s: Some(user_id),
            ..Default::default()
          },
        ),
        (
          PAKE_REGISTRATION_TABLE_DATA_ATTRIBUTE.to_string(),
          AttributeValue {
            b: Some(Bytes::from(registration.serialize())),
            ..Default::default()
          },
        ),
      ]),
      ..PutItemInput::default()
    };
    self.client.put_item(input).await
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
    let get_item_input = GetItemInput {
      table_name: ACCESS_TOKEN_TABLE.to_string(),
      key: primary_key,
      consistent_read: Some(true),
      ..GetItemInput::default()
    };
    let get_item_result = self.client.get_item(get_item_input).await;
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
        Err(Error::RusotoGet(e))
      }
    }
  }

  pub async fn put_access_token_data(
    &self,
    access_token_data: AccessTokenData,
  ) -> Result<PutItemOutput, Error> {
    let input = PutItemInput {
      table_name: ACCESS_TOKEN_TABLE.to_string(),
      item: HashMap::from([
        (
          ACCESS_TOKEN_TABLE_PARTITION_KEY.to_string(),
          AttributeValue {
            s: Some(access_token_data.user_id),
            ..Default::default()
          },
        ),
        (
          ACCESS_TOKEN_SORT_KEY.to_string(),
          AttributeValue {
            s: Some(access_token_data.device_id),
            ..Default::default()
          },
        ),
        (
          ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE.to_string(),
          AttributeValue {
            s: Some(access_token_data.access_token),
            ..Default::default()
          },
        ),
        (
          ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE.to_string(),
          AttributeValue {
            s: Some(access_token_data.created.to_rfc3339()),
            ..Default::default()
          },
        ),
        (
          ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE.to_string(),
          AttributeValue {
            s: Some(match access_token_data.auth_type {
              AuthType::Password => "password".to_string(),
              AuthType::Wallet => "wallet".to_string(),
            }),
            ..Default::default()
          },
        ),
        (
          ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE.to_string(),
          AttributeValue {
            bool: Some(access_token_data.valid),
            ..Default::default()
          },
        ),
      ]),
      ..PutItemInput::default()
    };
    self.client.put_item(input).await.map_err(Error::RusotoPut)
  }
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  RusotoGet(RusotoError<GetItemError>),
  #[display(...)]
  RusotoPut(RusotoError<PutItemError>),
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
  HashMap::from([(
    partition_key.0,
    AttributeValue {
      s: Some(partition_key.1),
      ..Default::default()
    },
  )])
}

fn create_composite_primary_key(
  partition_key: (AttributeName, String),
  sort_key: (AttributeName, String),
) -> HashMap<AttributeName, AttributeValue> {
  let mut primary_key = create_simple_primary_key(partition_key);
  primary_key.insert(
    sort_key.0,
    AttributeValue {
      s: Some(sort_key.1),
      ..Default::default()
    },
  );
  primary_key
}

fn parse_created_attribute(
  attribute: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  if let Some(AttributeValue {
    s: Some(created), ..
  }) = &attribute
  {
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
  if let Some(AttributeValue {
    s: Some(auth_type), ..
  }) = &attribute
  {
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
    Some(AttributeValue {
      bool: Some(valid), ..
    }) => Ok(valid),
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
    Some(AttributeValue { s: Some(token), .. }) => Ok(token),
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
    Some(AttributeValue {
      b: Some(server_registration_bytes),
      ..
    }) => {
      match ServerRegistration::<Cipher>::deserialize(server_registration_bytes)
      {
        Ok(server_registration) => Ok(server_registration),
        Err(e) => Err(DBItemError::new(
          PAKE_REGISTRATION_TABLE_DATA_ATTRIBUTE,
          attribute,
          DBItemAttributeError::Pake(e),
        )),
      }
    }
    Some(_) => Err(DBItemError::new(
      PAKE_REGISTRATION_TABLE_DATA_ATTRIBUTE,
      attribute,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      PAKE_REGISTRATION_TABLE_DATA_ATTRIBUTE,
      attribute,
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
    assert_eq!(
      attribute,
      Some(AttributeValue {
        s: Some(partition_key_value),
        ..Default::default()
      })
    );
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
      Some(AttributeValue {
        s: Some(partition_key_value),
        ..Default::default()
      })
    );
    let sort_key_attribute = primary_key.remove(&sort_key_name);
    assert!(sort_key_attribute.is_some());
    assert_eq!(
      sort_key_attribute,
      Some(AttributeValue {
        s: Some(sort_key_value),
        ..Default::default()
      })
    )
  }
}
