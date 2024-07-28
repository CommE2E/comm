use comm_lib::aws::ddb::error::SdkError;
use comm_lib::aws::ddb::operation::delete_item::{
  DeleteItemError, DeleteItemOutput,
};
use comm_lib::aws::ddb::operation::put_item::PutItemError;
use comm_lib::aws::ddb::operation::query::QueryError;
use comm_lib::aws::ddb::types::{AttributeValue, PutRequest, WriteRequest};
use comm_lib::aws::{AwsConfig, DynamoDBClient};
use comm_lib::database::{AttributeExtractor, AttributeMap, Error};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, error, warn};

use crate::constants::dynamodb::{device_tokens, undelivered_messages};
use crate::constants::MESSAGE_TTL_AFTER_DELETION_REQUEST;

pub mod message;
pub mod message_id;

use crate::database::message_id::MessageID;
pub use message::*;

#[derive(Clone)]
pub struct DatabaseClient {
  client: Arc<DynamoDBClient>,
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
  pub fn new(aws_config: &AwsConfig) -> Self {
    let client = DynamoDBClient::new(aws_config);

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
      .table_name(undelivered_messages::TABLE_NAME)
      .item(undelivered_messages::PARTITION_KEY, device_av)
      .item(undelivered_messages::SORT_KEY, message_id_av)
      .item(undelivered_messages::PAYLOAD, payload_av);

    debug!("Persisting message to device: {}", &device_id);

    request.send().await?;
    Ok(message_id)
  }

  pub async fn retrieve_messages(
    &self,
    device_id: &str,
  ) -> Result<Vec<AttributeMap>, SdkError<QueryError>> {
    debug!("Retrieving messages for device: {}", device_id);

    let response = self
      .client
      .query()
      .table_name(undelivered_messages::TABLE_NAME)
      .key_condition_expression(format!(
        "{} = :u",
        undelivered_messages::PARTITION_KEY
      ))
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
        undelivered_messages::PARTITION_KEY.to_string(),
        AttributeValue::S(device_id.to_string()),
      ),
      (
        undelivered_messages::SORT_KEY.to_string(),
        AttributeValue::S(message_id.to_string()),
      ),
    ]);

    self
      .client
      .delete_item()
      .table_name(undelivered_messages::TABLE_NAME)
      .set_key(Some(key))
      .send()
      .await
  }

  pub async fn mark_messages_to_device_for_deletion(
    &self,
    device_id: &str,
  ) -> Result<(), Error> {
    let messages = self.retrieve_messages(device_id).await.map_err(|e| {
      error!("DynamoDB client failed to retrieve messages: {:?}", e);
      Error::AwsSdk(e.into())
    })?;

    let expires_at = chrono::Utc::now() + MESSAGE_TTL_AFTER_DELETION_REQUEST;
    let expiration_attr = AttributeValue::N(expires_at.timestamp().to_string());

    let update_requests = messages
      .into_iter()
      .map(|mut attrs| {
        attrs.insert(
          undelivered_messages::EXPIRATION_TIME.to_string(),
          expiration_attr.clone(),
        );
        let put_request =
          PutRequest::builder().set_item(Some(attrs)).build().unwrap();
        WriteRequest::builder().put_request(put_request).build()
      })
      .collect();

    comm_lib::database::batch_operations::batch_write(
      &self.client,
      undelivered_messages::TABLE_NAME,
      update_requests,
      Default::default(),
    )
    .await?;

    Ok(())
  }

  pub async fn remove_device_token(
    &self,
    device_id: &str,
  ) -> Result<(), Error> {
    debug!("Removing device token for device: {}", &device_id);

    let device_av = AttributeValue::S(device_id.to_string());
    self
      .client
      .delete_item()
      .table_name(device_tokens::TABLE_NAME)
      .key(device_tokens::PARTITION_KEY, device_av)
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to remove device token: {:?}", e);
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn get_device_token(
    &self,
    device_id: &str,
  ) -> Result<Option<String>, Error> {
    let get_response = self
      .client
      .get_item()
      .table_name(device_tokens::TABLE_NAME)
      .key(
        device_tokens::PARTITION_KEY,
        AttributeValue::S(device_id.into()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to get device token");
        Error::AwsSdk(e.into())
      })?;

    let Some(mut item) = get_response.item else {
      return Ok(None);
    };

    let device_token: String = item.take_attr(device_tokens::DEVICE_TOKEN)?;
    Ok(Some(device_token))
  }

  pub async fn set_device_token(
    &self,
    device_id: &str,
    device_token: &str,
  ) -> Result<(), Error> {
    debug!("Setting device token for device: {}", &device_id);

    let query_response = self
      .client
      .query()
      .table_name(device_tokens::TABLE_NAME)
      .index_name(device_tokens::DEVICE_TOKEN_INDEX_NAME)
      .key_condition_expression("#device_token = :token")
      .expression_attribute_names("#device_token", device_tokens::DEVICE_TOKEN)
      .expression_attribute_values(
        ":token",
        AttributeValue::S(device_token.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!(
          "DynamoDB client failed to find existing device token {:?}",
          e
        );
        Error::AwsSdk(e.into())
      })?;

    if let Some(existing_tokens) = query_response.items {
      if existing_tokens.len() > 1 {
        warn!("Found the same token for multiple devices!");
        debug!("Duplicated token is: {device_token}. Removing...");
      } else if !existing_tokens.is_empty() {
        debug!(
          "Device token {device_token} already exists. It will be replaced..."
        );
      }

      for mut item in existing_tokens {
        let found_device_id =
          item.take_attr::<String>(device_tokens::DEVICE_ID)?;
        // PutItem will replace token with `device_id` key anyway.
        if found_device_id != device_id {
          self.remove_device_token(&found_device_id).await?;
        }
      }
    }

    self
      .client
      .put_item()
      .table_name(device_tokens::TABLE_NAME)
      .item(
        device_tokens::PARTITION_KEY,
        AttributeValue::S(device_id.to_string()),
      )
      .item(
        device_tokens::DEVICE_TOKEN,
        AttributeValue::S(device_token.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to set device token {:?}", e);
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }
}
