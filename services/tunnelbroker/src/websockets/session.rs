use crate::constants::{
  CLIENT_RMQ_MSG_PRIORITY, DDB_RMQ_MSG_PRIORITY, MAX_RMQ_MSG_PRIORITY,
  RMQ_CONSUMER_TAG,
};
use aws_sdk_dynamodb::error::SdkError;
use aws_sdk_dynamodb::operation::put_item::PutItemError;
use derive_more;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
use futures_util::StreamExt;
use hyper_tungstenite::{tungstenite::Message, WebSocketStream};
use lapin::message::Delivery;
use lapin::options::{
  BasicCancelOptions, BasicConsumeOptions, BasicPublishOptions,
  QueueDeclareOptions, QueueDeleteOptions,
};
use lapin::types::FieldTable;
use lapin::BasicProperties;
use tokio::io::AsyncRead;
use tokio::io::AsyncWrite;
use tracing::{debug, error, info};
use tunnelbroker_messages::{
  message_to_device_request_status::Failure,
  message_to_device_request_status::MessageSentStatus, session::DeviceTypes,
  MessageToDevice, MessageToDeviceRequest, Messages,
};

use crate::database::{self, DatabaseClient, MessageToDeviceTrait};
use crate::identity;

pub struct DeviceInfo {
  pub device_id: String,
  pub notify_token: Option<String>,
  pub device_type: DeviceTypes,
  pub device_app_version: Option<String>,
  pub device_os: Option<String>,
}

pub struct WebsocketSession<S> {
  tx: SplitSink<WebSocketStream<S>, Message>,
  db_client: DatabaseClient,
  pub device_info: DeviceInfo,
  amqp_channel: lapin::Channel,
  // Stream of messages from AMQP endpoint
  amqp_consumer: lapin::Consumer,
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum SessionError {
  InvalidMessage,
  SerializationError(serde_json::Error),
  MessageError(database::MessageErrors),
  AmqpError(lapin::Error),
  InternalError,
  UnauthorizedDevice,
  PersistenceError(SdkError<PutItemError>),
}

// Parse a session request and retrieve the device information
pub async fn handle_first_message_from_device(
  message: &str,
) -> Result<DeviceInfo, SessionError> {
  let serialized_message = serde_json::from_str::<Messages>(message)?;

  match serialized_message {
    Messages::ConnectionInitializationMessage(mut session_info) => {
      let device_info = DeviceInfo {
        device_id: session_info.device_id.clone(),
        notify_token: session_info.notify_token.take(),
        device_type: session_info.device_type,
        device_app_version: session_info.device_app_version.take(),
        device_os: session_info.device_os.take(),
      };

      // Authenticate device
      debug!("Authenticating device: {}", &session_info.device_id);
      let auth_request = identity::verify_user_access_token(
        &session_info.user_id,
        &device_info.device_id,
        &session_info.access_token,
      )
      .await;

      match auth_request {
        Err(e) => {
          error!("Failed to complete request to identity service: {:?}", e);
          return Err(SessionError::InternalError);
        }
        Ok(false) => {
          info!("Device failed authentication: {}", &session_info.device_id);
          return Err(SessionError::UnauthorizedDevice);
        }
        Ok(true) => {
          debug!(
            "Successfully authenticated device: {}",
            &session_info.device_id
          );
        }
      }

      Ok(device_info)
    }
    _ => {
      debug!("Received invalid request");
      Err(SessionError::InvalidMessage)
    }
  }
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
      error!("Error while retrieving messages: {}", e);
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

    if let Err(e) = db_client
      .delete_message(&device_info.device_id, &message_to_device.message_id)
      .await
    {
      error!("Failed to delete message: {}:", e);
    }
  }

  debug!("Flushed messages for device: {}", &device_info.device_id);
  Ok(())
}

impl<S: AsyncRead + AsyncWrite + Unpin> WebsocketSession<S> {
  pub async fn from_frame(
    tx: SplitSink<WebSocketStream<S>, Message>,
    db_client: DatabaseClient,
    frame: Message,
    amqp_channel: &lapin::Channel,
  ) -> Result<WebsocketSession<S>, SessionError> {
    let device_info = match frame {
      Message::Text(payload) => {
        handle_first_message_from_device(&payload).await?
      }
      _ => {
        error!("Client sent wrong frame type for establishing connection");
        return Err(SessionError::InvalidMessage);
      }
    };

    let mut args = FieldTable::default();
    args.insert("x-max-priority".into(), MAX_RMQ_MSG_PRIORITY.into());
    amqp_channel
      .queue_declare(
        &device_info.device_id,
        QueueDeclareOptions::default(),
        args,
      )
      .await?;

    publish_persisted_messages(&db_client, amqp_channel, &device_info).await?;

    let amqp_consumer = amqp_channel
      .basic_consume(
        &device_info.device_id,
        RMQ_CONSUMER_TAG,
        BasicConsumeOptions::default(),
        FieldTable::default(),
      )
      .await?;

    Ok(WebsocketSession {
      tx,
      db_client,
      device_info,
      amqp_channel: amqp_channel.clone(),
      amqp_consumer,
    })
  }

  pub async fn handle_message_to_device(
    &self,
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
      .amqp_channel
      .basic_publish(
        "",
        &message_request.device_id,
        BasicPublishOptions::default(),
        serialized_message.as_bytes(),
        BasicProperties::default().with_priority(CLIENT_RMQ_MSG_PRIORITY),
      )
      .await;

    if let Err(publish_error) = publish_result {
      self
        .db_client
        .delete_message(&self.device_info.device_id, &message_id)
        .await
        .expect("Error deleting message");
      return Err(SessionError::AmqpError(publish_error));
    }
    Ok(())
  }

  pub async fn handle_websocket_frame_from_device(
    &mut self,
    msg: String,
  ) -> MessageSentStatus {
    let Ok(serialized_message) = serde_json::from_str::<Messages>(&msg) else {
      return MessageSentStatus::SerializationError(msg);
    };

    match serialized_message {
      Messages::MessageToDeviceRequest(message_request) => {
        debug!("Received message for {}", message_request.device_id);

        let result = self.handle_message_to_device(&message_request).await;
        self.get_message_to_device_status(
          &message_request.client_message_id,
          result,
        )
      }
      _ => {
        error!("Client sent invalid message type");
        MessageSentStatus::InvalidRequest
      }
    }
  }

  pub async fn next_amqp_message(
    &mut self,
  ) -> Option<Result<Delivery, lapin::Error>> {
    self.amqp_consumer.next().await
  }

  pub async fn send_message_to_device(&mut self, message: Message) {
    if let Err(e) = self.tx.send(message).await {
      error!("Failed to send message to device: {}", e);
    }
  }

  // Release WebSocket and remove from active connections
  pub async fn close(&mut self) {
    if let Err(e) = self.tx.close().await {
      debug!("Failed to close WebSocket session: {}", e);
    }

    if let Err(e) = self
      .amqp_channel
      .basic_cancel(
        self.amqp_consumer.tag().as_str(),
        BasicCancelOptions::default(),
      )
      .await
    {
      error!("Failed to cancel consumer: {}", e);
    }

    if let Err(e) = self
      .amqp_channel
      .queue_delete(
        self.device_info.device_id.as_str(),
        QueueDeleteOptions::default(),
      )
      .await
    {
      error!("Failed to delete queue: {}", e);
    }
  }

  pub fn get_message_to_device_status(
    &mut self,
    client_message_id: &str,
    result: Result<(), SessionError>,
  ) -> MessageSentStatus {
    match result {
      Ok(()) => MessageSentStatus::Success(client_message_id.to_string()),
      Err(err) => MessageSentStatus::Error(Failure {
        id: client_message_id.to_string(),
        error: err.to_string(),
      }),
    }
  }
}
