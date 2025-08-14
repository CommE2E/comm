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
    use comm_lib::aws::ddb::types::{Put, TransactWriteItem, Update};
    use comm_lib::database::shared_tables::farcaster_tokens;

    // First, get the current farcaster_id to create farcaster_tokens entry
    let user_item = self
      .client
      .get_item()
      .table_name(USERS_TABLE)
      .key(
        USERS_TABLE_PARTITION_KEY,
        AttributeValue::S(user_id.clone()),
      )
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let Some(mut user) = user_item.item else {
      return Err(Error::MissingItem);
    };

    let farcaster_id: String = user
      .take_attr(USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME)
      .map_err(|_| Error::MissingItem)?; // User must have farcaster_id first

    // Update users table with DCS token
    let update_users = Update::builder()
      .table_name(USERS_TABLE)
      .key(
        USERS_TABLE_PARTITION_KEY,
        AttributeValue::S(user_id.clone()),
      )
      .update_expression(format!(
        "SET {0} = :val",
        USERS_TABLE_FARCASTER_DCS_TOKEN_ATTRIBUTE_NAME
      ))
      .expression_attribute_values(
        ":val",
        AttributeValue::S(farcaster_dcs_token.clone()),
      )
      .build()
      .expect("Failed to build Update for users table");

    let update_users_operation =
      TransactWriteItem::builder().update(update_users).build();

    // Create farcaster_tokens entry
    let farcaster_item = std::collections::HashMap::from([
      (
        farcaster_tokens::PARTITION_KEY.to_string(),
        AttributeValue::S(user_id.clone()),
      ),
      (
        farcaster_tokens::FARCASTER_ID.to_string(),
        AttributeValue::S(farcaster_id),
      ),
      (
        farcaster_tokens::FARCASTER_DCS_TOKEN.to_string(),
        AttributeValue::S(farcaster_dcs_token),
      ),
    ]);

    let put_farcaster_token = Put::builder()
      .table_name(farcaster_tokens::TABLE_NAME)
      .set_item(Some(farcaster_item))
      .build()
      .expect("Failed to build Put for farcaster_tokens table");

    let put_farcaster_token_operation = TransactWriteItem::builder()
      .put(put_farcaster_token)
      .build();

    // Execute both operations atomically
    self
      .client
      .transact_write_items()
      .set_transact_items(Some(vec![
        update_users_operation,
        put_farcaster_token_operation,
      ]))
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::FARCASTER_DB_LOG,
          "Transaction failed to add Farcaster DCs token: {:?}", e
        );
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn unlink_farcaster(&self, user_id: String) -> Result<(), Error> {
    use comm_lib::aws::ddb::types::{Delete, TransactWriteItem, Update};
    use comm_lib::database::shared_tables::farcaster_tokens;

    // Remove farcaster data from users table
    let update_expression = format!(
      "REMOVE {}, {}",
      USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME,
      USERS_TABLE_FARCASTER_DCS_TOKEN_ATTRIBUTE_NAME
    );

    let update_users = Update::builder()
      .table_name(USERS_TABLE)
      .key(
        USERS_TABLE_PARTITION_KEY,
        AttributeValue::S(user_id.clone()),
      )
      .update_expression(update_expression)
      .build()
      .expect("Failed to build Update for users table");

    let update_users_operation =
      TransactWriteItem::builder().update(update_users).build();

    // Remove from farcaster_tokens table
    let delete_farcaster_token = Delete::builder()
      .table_name(farcaster_tokens::TABLE_NAME)
      .key(
        farcaster_tokens::PARTITION_KEY,
        AttributeValue::S(user_id.clone()),
      )
      .build()
      .expect("Failed to build Delete for farcaster_tokens table");

    let delete_farcaster_token_operation = TransactWriteItem::builder()
      .delete(delete_farcaster_token)
      .build();

    // Execute both operations atomically
    self
      .client
      .transact_write_items()
      .set_transact_items(Some(vec![
        update_users_operation,
        delete_farcaster_token_operation,
      ]))
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::FARCASTER_DB_LOG,
          "Transaction failed to unlink farcaster: {:?}", e
        );
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  #[tracing::instrument(skip_all)]
  pub async fn delete_farcaster_tokens_for_user(
    &self,
    user_id: &str,
  ) -> Result<(), Error> {
    use comm_lib::database::shared_tables::farcaster_tokens;

    match self
      .client
      .delete_item()
      .table_name(farcaster_tokens::TABLE_NAME)
      .key(
        farcaster_tokens::PARTITION_KEY,
        AttributeValue::S(user_id.to_string()),
      )
      .send()
      .await
    {
      Ok(_) => {
        tracing::debug!(
          "Farcaster token has been deleted for user {}",
          user_id
        );
        Ok(())
      }
      Err(e) => {
        error!(
          errorType = error_types::FARCASTER_DB_LOG,
          "DynamoDB client failed to delete farcaster token for user {}: {}",
          user_id,
          e
        );
        Err(Error::AwsSdk(e.into()))
      }
    }
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
