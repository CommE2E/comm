use comm_lib::aws::ddb::{error::SdkError, operation::put_item::PutItemError};
use lapin::{options::BasicPublishOptions, BasicProperties};
use tunnelbroker_messages::{MessageToDevice, MessageToDeviceRequest};

use crate::{constants::CLIENT_RMQ_MSG_PRIORITY, database::DatabaseClient};

use super::amqp::AmqpChannel;

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum SendMessageError {
  PersistenceError(SdkError<PutItemError>),
  SerializationError(serde_json::Error),
  AmqpError(lapin::Error),
}

#[derive(Clone)]
pub struct BasicMessageSender {
  db_client: DatabaseClient,
  amqp_channel: AmqpChannel,
}

impl BasicMessageSender {
  pub fn new(
    database_client: &DatabaseClient,
    amqp_channel: AmqpChannel,
  ) -> Self {
    Self {
      db_client: database_client.clone(),
      amqp_channel,
    }
  }

  pub async fn send_message_to_device(
    &self,
    message_request: &MessageToDeviceRequest,
  ) -> Result<(), SendMessageError> {
    let MessageToDeviceRequest {
      client_message_id,
      device_id,
      payload,
    } = message_request;

    send_message_to_device(
      &self.db_client,
      &self.amqp_channel,
      device_id.clone(),
      payload.clone(),
      Some(client_message_id),
    )
    .await
  }

  pub async fn simple_send_message_to_device(
    &self,
    recipient_device_id: &str,
    payload: String,
  ) -> Result<(), SendMessageError> {
    self
      .send_message_to_device(&tunnelbroker_messages::MessageToDeviceRequest {
        client_message_id: uuid::Uuid::new_v4().to_string(),
        device_id: recipient_device_id.to_string(),
        payload,
      })
      .await
  }
}

pub async fn send_message_to_device(
  database_client: &DatabaseClient,
  amqp_channel: &AmqpChannel,
  device_id: String,
  payload: String,
  client_message_id: Option<&String>,
) -> Result<(), SendMessageError> {
  tracing::debug!("Received message for {}", &device_id);

  let client_message_id = client_message_id
    .cloned()
    .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

  let message_id = database_client
    .persist_message(&device_id, &payload, &client_message_id)
    .await?;

  let message_to_device = MessageToDevice {
    device_id: device_id.clone(),
    payload,
    message_id,
  };

  let serialized_message = serde_json::to_string(&message_to_device)?;

  amqp_channel
    .get()
    .await?
    .basic_publish(
      "",
      &device_id,
      BasicPublishOptions::default(),
      serialized_message.as_bytes(),
      BasicProperties::default().with_priority(CLIENT_RMQ_MSG_PRIORITY),
    )
    .await?;

  Ok(())
}
