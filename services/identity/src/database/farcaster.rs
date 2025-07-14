use comm_lib::aws::ddb::types::AttributeValue;
use comm_lib::aws::ddb::types::ReturnValue;
use comm_lib::database::AttributeExtractor;
use comm_lib::database::AttributeMap;
use comm_lib::database::DBItemAttributeError;
use comm_lib::database::DBItemError;
use comm_lib::database::Value;
use tracing::error;

use crate::constants::error_types;
use crate::constants::USERS_TABLE;
use crate::constants::USERS_TABLE_FARCASTER_DCS_TOKEN_ATTRIBUTE_NAME;
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
  #[tracing::instrument(skip_all)]
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
          error!(
            errorType = error_types::FARCASTER_DB_LOG,
            "Failed to query users by farcasterID: {:?}", e
          );
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
    let update_expression = format!(
      "SET {0} = if_not_exists({0}, :val) REMOVE {1}",
      USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME,
      USERS_TABLE_FARCASTER_DCS_TOKEN_ATTRIBUTE_NAME,
    );

    let response = self
      .client
      .update_item()
      .table_name(USERS_TABLE)
      .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id))
      .update_expression(update_expression)
      .expression_attribute_values(
        ":val",
        AttributeValue::S(farcaster_id.clone()),
      )
      .return_values(ReturnValue::UpdatedNew)
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::FARCASTER_DB_LOG,
          "DDB client failed to add farcasterID: {:?}", e
        );
        Error::AwsSdk(e.into())
      })?;

    match response.attributes {
      None => return Err(Error::MissingItem),
      Some(mut attrs) => {
        let farcaster_id_from_table: String =
          attrs.take_attr(USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME)?;
        if farcaster_id_from_table != farcaster_id {
          return Err(Error::CannotOverwrite);
        }
      }
    }

    Ok(())
  }

  pub async fn add_farcaster_dcs_token(
    &self,
    user_id: String,
    farcaster_dcs_token: String,
  ) -> Result<(), Error> {
    let update_expression = format!(
      "SET {0} = :val",
      USERS_TABLE_FARCASTER_DCS_TOKEN_ATTRIBUTE_NAME,
    );

    self
      .client
      .update_item()
      .table_name(USERS_TABLE)
      .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id))
      .update_expression(update_expression)
      .expression_attribute_values(
        ":val",
        AttributeValue::S(farcaster_dcs_token.clone()),
      )
      .return_values(ReturnValue::UpdatedNew)
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::FARCASTER_DB_LOG,
          "DDB client failed to add Farcaster DCs token: {:?}", e
        );
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn unlink_farcaster(&self, user_id: String) -> Result<(), Error> {
    let update_expression = format!(
      "REMOVE {}, {}",
      USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME,
      USERS_TABLE_FARCASTER_DCS_TOKEN_ATTRIBUTE_NAME
    );

    self
      .client
      .update_item()
      .table_name(USERS_TABLE)
      .key(USERS_TABLE_PARTITION_KEY, AttributeValue::S(user_id))
      .update_expression(update_expression)
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::FARCASTER_DB_LOG,
          "DDB client failed to remove farcasterID: {:?}", e
        );
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }
}

impl TryFrom<AttributeMap> for FarcasterUserData {
  type Error = DBItemError;

  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let user_id = attrs.take_attr(USERS_TABLE_PARTITION_KEY)?;
    let maybe_username = attrs.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE)?;
    let maybe_wallet_address =
      attrs.take_attr(USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE)?;
    let username = match (maybe_username, maybe_wallet_address) {
      (Some(u), _) => u,
      (_, Some(w)) => w,
      (_, _) => {
        return Err(DBItemError {
          attribute_name: USERS_TABLE_USERNAME_ATTRIBUTE.to_string(),
          attribute_value: Value::AttributeValue(None),
          attribute_error: DBItemAttributeError::Missing,
        });
      }
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
