use std::collections::HashMap;

use bytes::Bytes;
use chrono::{DateTime, ParseError, Utc};
use opaque_ke::{errors::ProtocolError, ServerRegistration};
use rusoto_core::{Region, RusotoError};
use rusoto_dynamodb::{
  AttributeValue, DynamoDb, DynamoDbClient, GetItemError, GetItemInput,
  GetItemOutput, PutItemError, PutItemInput, PutItemOutput,
};
use tracing::{error, info};

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
    let primary_key =
      create_simple_primary_key(("userID".to_string(), user_id.clone()));
    let get_item_input = GetItemInput {
      table_name: "identity-pake-registration".to_string(),
      key: primary_key,
      consistent_read: Some(true),
      ..GetItemInput::default()
    };
    let get_item_result = self.client.get_item(get_item_input).await;
    match get_item_result {
      Ok(GetItemOutput {
        item: Some(item), ..
      }) => {
        if let Some(AttributeValue {
          b: Some(server_registration_bytes),
          ..
        }) = item.get("pakeRegistrationData")
        {
          match ServerRegistration::<Cipher>::deserialize(
            server_registration_bytes,
          ) {
            Ok(server_registration) => Ok(Some(server_registration)),
            Err(e) => {
              error!(
                "Failed to deserialize ServerRegistration struct for user {}: {}",
                user_id, e
              );
              Err(Error::Pake(e))
            }
          }
        } else {
          error!("No registration data found for registered user {}", user_id);
          Err(Error::MissingAttribute)
        }
      }
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
      table_name: "identity-pake-registration".to_string(),
      item: HashMap::from([
        (
          "userID".to_string(),
          AttributeValue {
            s: Some(user_id),
            ..Default::default()
          },
        ),
        (
          "pakeRegistrationData".to_string(),
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
      ("userID".to_string(), user_id.clone()),
      ("deviceID".to_string(), device_id.clone()),
    );
    let get_item_input = GetItemInput {
      table_name: "identity-tokens".to_string(),
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
        let created = parse_created_attribute(item.remove("created"))?;
        let auth_type = parse_auth_type_attribute(item.remove("authType"))?;
        let valid = parse_valid_attribute(item.remove("valid"))?;
        let access_token = parse_token_attribute(item.remove("token"))?;
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
      table_name: "identity-tokens".to_string(),
      item: HashMap::from([
        (
          "userID".to_string(),
          AttributeValue {
            s: Some(access_token_data.user_id),
            ..Default::default()
          },
        ),
        (
          "deviceID".to_string(),
          AttributeValue {
            s: Some(access_token_data.device_id),
            ..Default::default()
          },
        ),
        (
          "token".to_string(),
          AttributeValue {
            s: Some(access_token_data.access_token),
            ..Default::default()
          },
        ),
        (
          "created".to_string(),
          AttributeValue {
            s: Some(access_token_data.created.to_rfc3339()),
            ..Default::default()
          },
        ),
        (
          "authType".to_string(),
          AttributeValue {
            s: Some(match access_token_data.auth_type {
              AuthType::Password => "password".to_string(),
              AuthType::Wallet => "wallet".to_string(),
            }),
            ..Default::default()
          },
        ),
        (
          "valid".to_string(),
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
  Pake(ProtocolError),
  #[display(...)]
  MissingAttribute,
  #[display(...)]
  InvalidTimestamp(ParseError),
  #[display(...)]
  InvalidAuthType,
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
) -> Result<DateTime<Utc>, Error> {
  if let Some(AttributeValue {
    s: Some(created), ..
  }) = attribute
  {
    created.parse().map_err(Error::InvalidTimestamp)
  } else {
    Err(Error::MissingAttribute)
  }
}

fn parse_auth_type_attribute(
  attribute: Option<AttributeValue>,
) -> Result<AuthType, Error> {
  if let Some(AttributeValue {
    s: Some(auth_type), ..
  }) = attribute
  {
    match auth_type.as_str() {
      "password" => Ok(AuthType::Password),
      "wallet" => Ok(AuthType::Wallet),
      _ => Err(Error::InvalidAuthType),
    }
  } else {
    Err(Error::MissingAttribute)
  }
}

fn parse_valid_attribute(
  attribute: Option<AttributeValue>,
) -> Result<bool, Error> {
  if let Some(AttributeValue {
    bool: Some(valid), ..
  }) = attribute
  {
    Ok(valid)
  } else {
    Err(Error::MissingAttribute)
  }
}

fn parse_token_attribute(
  attribute: Option<AttributeValue>,
) -> Result<String, Error> {
  if let Some(AttributeValue { s: Some(token), .. }) = attribute {
    Ok(token)
  } else {
    Err(Error::MissingAttribute)
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
