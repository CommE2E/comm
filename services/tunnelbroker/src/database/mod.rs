use aws_config::SdkConfig;
use aws_sdk_dynamodb::error::SdkError;
use aws_sdk_dynamodb::operation::delete_item::{
  DeleteItemError, DeleteItemOutput,
};
use aws_sdk_dynamodb::operation::put_item::{PutItemError, PutItemOutput};
use aws_sdk_dynamodb::operation::query::QueryError;
use aws_sdk_dynamodb::{types::AttributeValue, Client};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{debug, error};

use crate::constants::dynamodb::undelivered_messages::{
  CREATED_AT, PARTITION_KEY, PAYLOAD, SORT_KEY, TABLE_NAME,
};

pub mod message;
pub use message::*;

#[derive(Clone)]
pub struct DatabaseClient {
  client: Arc<Client>,
}

pub fn unix_timestamp() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .expect("System time is misconfigured")
    .as_secs()
}

pub fn handle_ddb_error<E>(db_error: SdkError<E>) -> tonic::Status {
  match db_error {
    SdkError::TimeoutError(_) | SdkError::ServiceError(_) => {
      tonic::Status::unavailable("please retry")
    }
    e => {
      error!("Encountered an unexpected error: {}", e);
      tonic::Status::failed_precondition("unexpected error")
    }
  }
}

impl DatabaseClient {
  pub fn new(aws_config: &SdkConfig) -> Self {
    let client = Client::new(aws_config);

    DatabaseClient {
      client: Arc::new(client),
    }
  }

  pub async fn persist_message(
    &self,
    device_id: &str,
    payload: &str,
  ) -> Result<PutItemOutput, SdkError<PutItemError>> {
    let device_av = AttributeValue::S(device_id.to_string());
    let payload_av = AttributeValue::S(payload.to_string());
    let created_av = AttributeValue::N(unix_timestamp().to_string());

    let request = self
      .client
      .put_item()
      .table_name(TABLE_NAME)
      .item(PARTITION_KEY, device_av)
      .item(PAYLOAD, payload_av)
      .item(CREATED_AT, created_av);

    debug!("Persisting message to device: {}", &device_id);

    request.send().await
  }

  pub async fn retrieve_messages(
    &self,
    device_id: &str,
  ) -> Result<Vec<HashMap<String, AttributeValue>>, SdkError<QueryError>> {
    debug!("Retrieving messages for device: {}", device_id);

    let response = self
      .client
      .query()
      .table_name(TABLE_NAME)
      .key_condition_expression(format!("{} = :u", PARTITION_KEY))
      .expression_attribute_values(
        ":u",
        AttributeValue::S(device_id.to_string()),
      )
      .consistent_read(true)
      .send()
      .await?;

    debug!("Retrieved {} messages for {}", response.count, device_id);
    match response.items {
      None => Ok(Vec::new()),
      Some(items) => Ok(items.to_vec()),
    }
  }

  pub async fn delete_message(
    &self,
    device_id: &str,
    created_at: &str,
  ) -> Result<DeleteItemOutput, SdkError<DeleteItemError>> {
    debug!("Deleting message for device: {}", device_id);

    let key = HashMap::from([
      (
        PARTITION_KEY.to_string(),
        AttributeValue::S(device_id.to_string()),
      ),
      (
        SORT_KEY.to_string(),
        AttributeValue::N(created_at.to_string()),
      ),
    ]);

    self
      .client
      .delete_item()
      .table_name(TABLE_NAME)
      .set_key(Some(key))
      .send()
      .await
  }
}
