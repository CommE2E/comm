use std::collections::HashMap;

use opaque_ke::{errors::ProtocolError, ServerRegistration};
use rusoto_core::{Region, RusotoError};
use rusoto_dynamodb::{
  AttributeValue, DynamoDb, DynamoDbClient, GetItemError, GetItemInput,
  GetItemOutput,
};
use tracing::{error, info};

use crate::opaque::Cipher;

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
        Err(Error::Rusoto(e))
      }
    }
  }
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  Rusoto(RusotoError<GetItemError>),
  #[display(...)]
  Pake(ProtocolError),
  #[display(...)]
  MissingAttribute,
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

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_create_simple_primary_key() {
    let partition_key_name = "userID".to_string();
    let partition_key_value = "12345".to_string();
    let partition_key =
      (partition_key_name.clone(), partition_key_value.clone());
    let primary_key = create_simple_primary_key(partition_key);
    assert_eq!(primary_key.len(), 1);
    let attribute = primary_key.get(&partition_key_name);
    assert!(attribute.is_some());
    assert_eq!(
      attribute,
      Some(AttributeValue {
        s: Some(partition_key_value),
        ..Default::default()
      })
      .as_ref()
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
    let primary_key = create_composite_primary_key(partition_key, sort_key);
    assert_eq!(primary_key.len(), 2);
    let partition_key_attribute = primary_key.get(&partition_key_name);
    assert!(partition_key_attribute.is_some());
    assert_eq!(
      partition_key_attribute,
      Some(AttributeValue {
        s: Some(partition_key_value),
        ..Default::default()
      })
      .as_ref()
    );
    let sort_key_attribute = primary_key.get(&sort_key_name);
    assert!(sort_key_attribute.is_some());
    assert_eq!(
      sort_key_attribute,
      Some(AttributeValue {
        s: Some(sort_key_value),
        ..Default::default()
      })
      .as_ref()
    )
  }
}
