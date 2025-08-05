use crate::amqp_client::amqp::{is_connection_error, AmqpConnection};
use crate::constants::{
  error_types, CLIENT_RMQ_MSG_PRIORITY, DDB_RMQ_MSG_PRIORITY,
  MAX_RMQ_MSG_PRIORITY, RMQ_CONSUMER_TAG,
};
use crate::database::{DatabaseClient, MessageToDeviceExt};
use crate::websockets::session::{DeviceInfo, SessionError};
use futures_util::StreamExt;
use lapin::message::Delivery;
use lapin::options::{
  BasicCancelOptions, BasicConsumeOptions, BasicPublishOptions,
  QueueDeclareOptions, QueueDeleteOptions,
};
use lapin::types::FieldTable;
use lapin::BasicProperties;
use tracing::{debug, error, warn};
use tunnelbroker_messages::{MessageToDevice, MessageToDeviceRequest};

pub mod amqp;

pub struct AmqpClient {
  db_client: DatabaseClient,
  device_info: DeviceInfo,
  amqp: AmqpConnection,
  amqp_channel: lapin::Channel,
  amqp_consumer: lapin::Consumer,
}

async fn publish_persisted_messages(
  db_client: &DatabaseClient,
  amqp_channel: &lapin::Channel,
  device_info: &DeviceInfo,
) -> Result<(), SessionError> {
  let messages = db_client
    .retrieve_messages(&device_info.device_id)
    .await
    .unwrap_or_else(|e| {
      error!(
        errorType = error_types::DDB_ERROR,
        "Error while retrieving messages: {}", e
      );
      Vec::new()
    });

  for message in messages {
    let message_to_device = MessageToDevice::from_hashmap(message)?;

    let serialized_message = serde_json::to_string(&message_to_device)?;

    amqp_channel
      .basic_publish(
        "",
        &message_to_device.device_id,
        BasicPublishOptions::default(),
        serialized_message.as_bytes(),
        BasicProperties::default().with_priority(DDB_RMQ_MSG_PRIORITY),
      )
      .await?;
  }

  debug!("Flushed messages for device: {}", &device_info.device_id);
  Ok(())
}

impl AmqpClient {
  pub async fn new(
    db_client: DatabaseClient,
    device_info: DeviceInfo,
    amqp: AmqpConnection,
  ) -> Result<Self, SessionError> {
    let (amqp_channel, amqp_consumer) =
      Self::init_amqp(&device_info, &db_client, &amqp).await?;

    Ok(Self {
      db_client,
      device_info,
      amqp,
      amqp_channel,
      amqp_consumer,
    })
  }

  async fn init_amqp(
    device_info: &DeviceInfo,
    db_client: &DatabaseClient,
    amqp: &AmqpConnection,
  ) -> Result<(lapin::Channel, lapin::Consumer), SessionError> {
    let amqp_channel = amqp.new_channel().await?;
    debug!(
      "Got AMQP Channel Id={} for device '{}'",
      amqp_channel.id(),
      device_info.device_id
    );

    let mut args = FieldTable::default();
    args.insert("x-max-priority".into(), MAX_RMQ_MSG_PRIORITY.into());
    amqp_channel
      .queue_declare(
        &device_info.device_id,
        QueueDeclareOptions::default(),
        args,
      )
      .await?;

    publish_persisted_messages(db_client, &amqp_channel, device_info).await?;

    let amqp_consumer = amqp_channel
      .basic_consume(
        &device_info.device_id,
        RMQ_CONSUMER_TAG,
        BasicConsumeOptions {
          no_ack: true,
          ..Default::default()
        },
        FieldTable::default(),
      )
      .await?;
    Ok((amqp_channel, amqp_consumer))
  }

  fn is_amqp_channel_dead(&self) -> bool {
    !self.amqp_channel.status().connected()
  }

  pub async fn reset_failed_amqp(&mut self) -> Result<(), SessionError> {
    if self.amqp_channel.status().connected()
      && self.amqp_consumer.state().is_active()
    {
      return Ok(());
    }
    debug!(
      "Resetting failed amqp for session with {}",
      &self.device_info.device_id
    );

    let (amqp_channel, amqp_consumer) =
      Self::init_amqp(&self.device_info, &self.db_client, &self.amqp).await?;

    self.amqp_channel = amqp_channel;
    self.amqp_consumer = amqp_consumer;

    Ok(())
  }

  async fn publish_amqp_message_to_device(
    &mut self,
    device_id: &str,
    payload: &[u8],
  ) -> Result<lapin::publisher_confirm::PublisherConfirm, SessionError> {
    if self.is_amqp_channel_dead() {
      self.reset_failed_amqp().await?;
    }
    let publish_result = self
      .amqp_channel
      .basic_publish(
        "",
        device_id,
        BasicPublishOptions::default(),
        payload,
        BasicProperties::default().with_priority(CLIENT_RMQ_MSG_PRIORITY),
      )
      .await?;
    Ok(publish_result)
  }

  pub async fn next_amqp_message(
    &mut self,
  ) -> Option<Result<Delivery, lapin::Error>> {
    self.amqp_consumer.next().await
  }

  pub async fn close_connection(&mut self) {
    if self.is_amqp_channel_dead() {
      warn!("AMQP channel or connection dead when closing WS session.");
      self.amqp.maybe_reconnect_in_background();
      return;
    }
    if let Err(e) = self
      .amqp_channel
      .basic_cancel(
        self.amqp_consumer.tag().as_str(),
        BasicCancelOptions::default(),
      )
      .await
    {
      if !is_connection_error(&e) {
        error!(
          errorType = error_types::AMQP_ERROR,
          "Failed to cancel consumer: {}", e
        );
      }
    }

    if let Err(e) = self
      .amqp_channel
      .queue_delete(
        self.device_info.device_id.as_str(),
        QueueDeleteOptions::default(),
      )
      .await
    {
      if !is_connection_error(&e) {
        error!(
          errorType = error_types::AMQP_ERROR,
          "Failed to delete queue: {}", e
        );
      }
    }
  }

  pub async fn handle_message_to_device(
    &mut self,
    message_request: &MessageToDeviceRequest,
  ) -> Result<(), SessionError> {
    let message_id = self
      .db_client
      .persist_message(
        &message_request.device_id,
        &message_request.payload,
        &message_request.client_message_id,
      )
      .await?;

    let message_to_device = MessageToDevice {
      device_id: message_request.device_id.clone(),
      payload: message_request.payload.clone(),
      message_id: message_id.clone(),
    };

    let serialized_message = serde_json::to_string(&message_to_device)?;

    let publish_result = self
      .publish_amqp_message_to_device(
        &message_request.device_id,
        serialized_message.as_bytes(),
      )
      .await;

    if let Err(amqp_session_error) = publish_result {
      self
        .db_client
        .delete_message(&self.device_info.device_id, &message_id)
        .await
        .expect("Error deleting message");
      return Err(amqp_session_error);
    }
    Ok(())
  }
}
