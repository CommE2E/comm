use crate::constants::error_types;
use crate::database::DatabaseClient;
use comm_lib::aws::ddb::operation::update_item::UpdateItemError;
use comm_lib::aws::ddb::types::AttributeValue;
use comm_lib::database::shared_tables::farcaster_tokens;
use comm_lib::database::{AttributeExtractor, AttributeMap, Error};
use futures_util::TryFutureExt;
use tracing::{debug, error};

pub struct TokenEntryInfo {
  pub user_id: String,
  pub token_data: String,
  pub fid: String,
}

impl DatabaseClient {
  pub async fn scan_orphaned_tokens(
    &self,
    timeout_threshold: u64,
  ) -> Result<Vec<TokenEntryInfo>, Error> {
    debug!(
      "Starting scan for orphaned tokens - timeout_threshold: {}",
      timeout_threshold
    );
    let mut orphaned_tokens = Vec::new();

    // Query unassigned tokens using sparse index
    let unassigned_future = self
      .client
      .query()
      .table_name(farcaster_tokens::TABLE_NAME)
      .index_name(farcaster_tokens::UNASSIGNED_INDEX)
      .key_condition_expression("#unassigned = :unassigned_val")
      .expression_attribute_names("#unassigned", farcaster_tokens::UNASSIGNED)
      .expression_attribute_values(
        ":unassigned_val",
        AttributeValue::S("true".to_string()),
      )
      .send();

    // Query expired tokens using composite index
    let expired_future = self
      .client
      .scan()
      .table_name(farcaster_tokens::TABLE_NAME)
      .index_name(farcaster_tokens::ASSIGNED_INSTANCE_LAST_HEARTBEAT_INDEX)
      .filter_expression("#last_heartbeat < :timeout")
      .expression_attribute_names(
        "#last_heartbeat",
        farcaster_tokens::LAST_HEARTBEAT,
      )
      .expression_attribute_values(
        ":timeout",
        AttributeValue::N(timeout_threshold.to_string()),
      )
      .send();

    // Execute queries in parallel
    let (unassigned_result, expired_result) = tokio::try_join!(
      unassigned_future.map_err(|e| {
        error!(
          errorType = error_types::DDB_ERROR,
          "Failed to query unassigned tokens: {:?}", e
        );
        Error::AwsSdk(e.into())
      }),
      expired_future.map_err(|e| {
        error!(
          errorType = error_types::DDB_ERROR,
          "Failed to query expired tokens: {:?}", e
        );
        Error::AwsSdk(e.into())
      })
    )?;

    fn process_items(
      items: impl IntoIterator<Item = AttributeMap>,
    ) -> impl Iterator<Item = TokenEntryInfo> {
      items.into_iter().filter_map(|mut item| {
        let user_id = item.take_attr(farcaster_tokens::PARTITION_KEY).ok()?;
        let token_data =
          item.take_attr(farcaster_tokens::FARCASTER_DCS_TOKEN).ok()?;
        let fid = item.take_attr(farcaster_tokens::FARCASTER_ID).ok()?;
        Some(TokenEntryInfo {
          user_id,
          token_data,
          fid,
        })
      })
    }

    let unassigned_items = unassigned_result.items.unwrap_or_default();
    let expired_items = expired_result.items.unwrap_or_default();

    debug!(
      "Found {} unassigned tokens and {} expired tokens in database",
      unassigned_items.len(),
      expired_items.len()
    );

    orphaned_tokens.extend(process_items(unassigned_items));
    orphaned_tokens.extend(process_items(expired_items));

    debug!(
      "Processed {} total orphaned tokens for claiming",
      orphaned_tokens.len()
    );
    Ok(orphaned_tokens)
  }

  pub async fn claim_token(
    &self,
    user_id: &str,
    instance_id: &str,
    timeout_threshold: u64,
  ) -> Result<bool, Error> {
    debug!(
      "Attempting to claim token for user: {} by instance: {}",
      user_id, instance_id
    );
    let now = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .expect("Time went backwards")
      .as_secs();

    let result = self
      .client
      .update_item()
      .table_name(farcaster_tokens::TABLE_NAME)
      .key(
        farcaster_tokens::PARTITION_KEY,
        AttributeValue::S(user_id.to_string()),
      )
      .update_expression(
        "SET \
            #assigned_instance = :instance_id, \
            #assignment_timestamp = :now, \
            #last_heartbeat = :now \
        REMOVE #unassigned",
      )
      .condition_expression(
        "attribute_not_exists(#assigned_instance) \
               OR #last_heartbeat < :timeout",
      )
      .expression_attribute_names(
        "#assigned_instance",
        farcaster_tokens::ASSIGNED_INSTANCE,
      )
      .expression_attribute_names(
        "#assignment_timestamp",
        farcaster_tokens::ASSIGNMENT_TIMESTAMP,
      )
      .expression_attribute_names(
        "#last_heartbeat",
        farcaster_tokens::LAST_HEARTBEAT,
      )
      .expression_attribute_names("#unassigned", farcaster_tokens::UNASSIGNED)
      .expression_attribute_values(
        ":instance_id",
        AttributeValue::S(instance_id.to_string()),
      )
      .expression_attribute_values(":now", AttributeValue::N(now.to_string()))
      .expression_attribute_values(
        ":timeout",
        AttributeValue::N(timeout_threshold.to_string()),
      )
      .send()
      .await;

    match result {
      Ok(_) => {
        debug!(
          "Token successfully claimed for user: {} by instance: {}",
          user_id, instance_id
        );
        Ok(true)
      }
      Err(sdk_error) => match sdk_error.into_service_error() {
        UpdateItemError::ConditionalCheckFailedException(_) => {
          debug!("Token claim failed for user: {} - already claimed or condition not met", user_id);
          Ok(false)
        }
        other => {
          error!(
            errorType = error_types::DDB_ERROR,
            "Database error claiming token for user {}: {:?}", user_id, other
          );
          Err(Error::AwsSdk(other.into()))
        }
      },
    }
  }

  pub async fn update_token_heartbeat(
    &self,
    user_id: &str,
    instance_id: &str,
  ) -> Result<bool, Error> {
    let now = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .expect("Time went backwards")
      .as_secs();

    let result = self
      .client
      .update_item()
      .table_name(farcaster_tokens::TABLE_NAME)
      .key(
        farcaster_tokens::PARTITION_KEY,
        AttributeValue::S(user_id.to_string()),
      )
      .update_expression("SET #last_heartbeat = :now")
      .condition_expression("#assigned_instance = :instance_id")
      .expression_attribute_names(
        "#last_heartbeat",
        farcaster_tokens::LAST_HEARTBEAT,
      )
      .expression_attribute_names(
        "#assigned_instance",
        farcaster_tokens::ASSIGNED_INSTANCE,
      )
      .expression_attribute_values(":now", AttributeValue::N(now.to_string()))
      .expression_attribute_values(
        ":instance_id",
        AttributeValue::S(instance_id.to_string()),
      )
      .send()
      .await;

    match result {
      Ok(_) => Ok(true),
      Err(sdk_error) => match sdk_error.into_service_error() {
        UpdateItemError::ConditionalCheckFailedException(_) => Ok(false),
        other => {
          error!(
            errorType = error_types::DDB_ERROR,
            "Failed to update token heartbeat: {:?}", other
          );
          Err(Error::AwsSdk(other.into()))
        }
      },
    }
  }

  pub async fn get_user_ids_with_token_for_instance(
    &self,
    instance_id: &str,
  ) -> Result<Vec<String>, Error> {
    let query_result = self
      .client
      .query()
      .table_name(farcaster_tokens::TABLE_NAME)
      .index_name(farcaster_tokens::ASSIGNED_INSTANCE_LAST_HEARTBEAT_INDEX)
      .key_condition_expression("#assigned_instance = :instance_id")
      .expression_attribute_names(
        "#assigned_instance",
        farcaster_tokens::ASSIGNED_INSTANCE,
      )
      .expression_attribute_values(
        ":instance_id",
        AttributeValue::S(instance_id.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::DDB_ERROR,
          "Failed to query tokens for instance {}: {:?}", instance_id, e
        );
        Error::AwsSdk(e.into())
      })?;

    let mut user_ids = Vec::new();
    let items = query_result.items.unwrap_or_default();

    for item in items {
      if let Some(AttributeValue::S(user_id)) =
        item.get(farcaster_tokens::PARTITION_KEY)
      {
        user_ids.push(user_id.to_string());
      }
    }

    Ok(user_ids)
  }

  pub async fn release_token(
    &self,
    user_id: &str,
    instance_id: &str,
  ) -> Result<bool, Error> {
    debug!(
      "Attempting to release token for user: {} from instance: {}",
      user_id, instance_id
    );
    let result = self
      .client
      .update_item()
      .table_name(farcaster_tokens::TABLE_NAME)
      .key(
        farcaster_tokens::PARTITION_KEY,
        AttributeValue::S(user_id.to_string()),
      )
      .update_expression(
        "SET \
            #unassigned = :unassigned_val \
        REMOVE \
            #assigned_instance, \
            #assignment_timestamp, \
            #last_heartbeat",
      )
      .condition_expression("#assigned_instance = :instance_id")
      .expression_attribute_names("#unassigned", farcaster_tokens::UNASSIGNED)
      .expression_attribute_names(
        "#assigned_instance",
        farcaster_tokens::ASSIGNED_INSTANCE,
      )
      .expression_attribute_names(
        "#assignment_timestamp",
        farcaster_tokens::ASSIGNMENT_TIMESTAMP,
      )
      .expression_attribute_names(
        "#last_heartbeat",
        farcaster_tokens::LAST_HEARTBEAT,
      )
      .expression_attribute_values(
        ":unassigned_val",
        AttributeValue::S("true".to_string()),
      )
      .expression_attribute_values(
        ":instance_id",
        AttributeValue::S(instance_id.to_string()),
      )
      .send()
      .await;

    match result {
      Ok(_) => {
        debug!(
          "Token successfully released for user: {} from instance: {}",
          user_id, instance_id
        );
        Ok(true)
      }
      Err(sdk_error) => match sdk_error.into_service_error() {
        UpdateItemError::ConditionalCheckFailedException(_) => {
          debug!("Token release failed for user: {} - already released or owned by different instance", user_id);
          Ok(false)
        }
        other => {
          error!(
            errorType = error_types::DDB_ERROR,
            "Database error releasing token for user {}: {:?}", user_id, other
          );
          Err(Error::AwsSdk(other.into()))
        }
      },
    }
  }

  pub async fn get_total_tokens_count(&self) -> Result<usize, Error> {
    debug!("Getting total tokens count from DynamoDB");

    let result = self
      .client
      .scan()
      .table_name(farcaster_tokens::TABLE_NAME)
      .select("COUNT".parse().unwrap())
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::DDB_ERROR,
          "Failed to get total tokens count: {:?}", e
        );
        Error::AwsSdk(e.into())
      })?;

    let count = result.count as usize;
    debug!("Total tokens count: {}", count);
    Ok(count)
  }
}
