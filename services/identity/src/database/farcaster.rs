use std::collections::HashMap;

use comm_lib::aws::ddb::types::AttributeValue;
use comm_lib::database::AttributeExtractor;
use comm_lib::database::AttributeMap;
use comm_lib::database::DBItemAttributeError;
use comm_lib::database::DBItemError;
use comm_lib::database::TryFromAttribute;
use comm_lib::database::Value;
use tracing::error;

use crate::constants::USERS_TABLE;
use crate::constants::USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME;
use crate::constants::USERS_TABLE_FARCASTER_ID_INDEX;
use crate::constants::USERS_TABLE_PARTITION_KEY;
use crate::constants::USERS_TABLE_USERNAME_ATTRIBUTE;
use crate::constants::USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE;
use crate::grpc_services::protos::unauth::FarcasterUser;

use super::DatabaseClient;
use super::Error;

pub struct FarcasterUserData(pub FarcasterUser);

impl DatabaseClient {
  pub async fn get_farcaster_users(
    &self,
    farcaster_ids: Vec<String>,
  ) -> Result<Vec<FarcasterUserData>, Error> {
    let mut users: Vec<FarcasterUserData> = Vec::new();

    for id in farcaster_ids {
      let query_response = self
        .client
        .query()
        .table_name(USERS_TABLE)
        .index_name(USERS_TABLE_FARCASTER_ID_INDEX)
        .key_condition_expression(format!(
          "{} = :val",
          USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME
        ))
        .expression_attribute_values(":val", AttributeValue::S(id))
        .send()
        .await
        .map_err(|e| {
          error!("Failed to query users by farcasterID: {:?}", e);
          Error::AwsSdk(e.into())
        })?
        .items
        .and_then(|mut items| items.pop())
        .map(FarcasterUserData::try_from)
        .transpose()
        .map_err(Error::from)?;
      if let Some(data) = query_response {
        users.push(data);
      }
    }

    Ok(users)
  }

  pub async fn add_farcaster_id(
    &self,
    user_id: String,
    farcaster_id: String,
  ) -> Result<(), Error> {
    let update_expression =
      format!("SET {} = :val", USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME);
    let expression_attribute_values =
      HashMap::from([(":val".to_string(), AttributeValue::S(farcaster_id))]);

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
}

impl TryFrom<AttributeMap> for FarcasterUserData {
  type Error = DBItemError;

  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let user_id = attrs.take_attr(USERS_TABLE_PARTITION_KEY)?;
    let mut username_opt = Option::try_from_attr(
      USERS_TABLE_USERNAME_ATTRIBUTE,
      attrs.remove(USERS_TABLE_USERNAME_ATTRIBUTE),
    )?;
    if username_opt.is_none() {
      username_opt =
        Some(attrs.take_attr(USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE)?);
    }
    let username = if let Some(u) = username_opt {
      u
    } else {
      return Err(DBItemError {
        attribute_name: USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE.to_string(),
        attribute_value: Value::AttributeValue(None),
        attribute_error: DBItemAttributeError::Missing,
      });
    };
    let farcaster_id =
      attrs.take_attr(USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME)?;

    Ok(Self(FarcasterUser {
      user_id,
      username,
      farcaster_id,
    }))
  }
}
