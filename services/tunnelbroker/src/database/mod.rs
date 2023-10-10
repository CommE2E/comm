use aws_config::SdkConfig;
use aws_sdk_dynamodb::error::SdkError;
use aws_sdk_dynamodb::operation::delete_item::{
  DeleteItemError, DeleteItemOutput,
};
use aws_sdk_dynamodb::operation::put_item::PutItemError;
use aws_sdk_dynamodb::operation::query::QueryError;
use aws_sdk_dynamodb::{types::AttributeValue, Client};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, error};

use crate::constants::dynamodb::undelivered_messages::{
  PARTITION_KEY, PAYLOAD, SORT_KEY, TABLE_NAME,
};

pub mod message;
pub mod message_id;

use crate::database::message_id::MessageID;
pub use message::*;

#[derive(Clone)]
pub struct DatabaseClient {
  client: Arc<Client>,
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
    client_message_id: &str,
  ) -> Result<String, SdkError<PutItemError>> {
    let message_id: String =
      MessageID::new(client_message_id.to_string()).into();

    let device_av = AttributeValue::S(device_id.to_string());
    let payload_av = AttributeValue::S(payload.to_string());
    let message_id_av = AttributeValue::S(message_id.clone());

    let request = self
      .client
      .put_item()
      .table_name(TABLE_NAME)
      .item(PARTITION_KEY, device_av)
      .item(SORT_KEY, message_id_av)
      .item(PAYLOAD, payload_av);

    debug!("Persisting message to device: {}", &device_id);

    request.send().await?;
    Ok(message_id)
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
    message_id: &str,
  ) -> Result<DeleteItemOutput, SdkError<DeleteItemError>> {
    debug!("Deleting message for device: {}", device_id);

    let key = HashMap::from([
      (
        PARTITION_KEY.to_string(),
        AttributeValue::S(device_id.to_string()),
      ),
      (
        SORT_KEY.to_string(),
        AttributeValue::S(message_id.to_string()),
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
