use derive_more;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
use futures_util::StreamExt;
use lapin::message::Delivery;
use lapin::options::{BasicConsumeOptions, QueueDeclareOptions};
use lapin::types::FieldTable;
use tokio::net::TcpStream;
use tokio_tungstenite::{tungstenite::Message, WebSocketStream};
use tracing::{debug, error};
use tunnelbroker_messages::{session::DeviceTypes, Messages};

use crate::database::{self, DatabaseClient, DeviceMessage};

pub struct DeviceInfo {
  pub device_id: String,
  pub notify_token: Option<String>,
  pub device_type: DeviceTypes,
  pub device_app_version: Option<String>,
  pub device_os: Option<String>,
}

pub struct WebsocketSession {
  tx: SplitSink<WebSocketStream<TcpStream>, Message>,
  db_client: DatabaseClient,
  pub device_info: DeviceInfo,
  // Stream of messages from AMQP endpoint
  amqp_consumer: lapin::Consumer,
}

#[derive(Debug, derive_more::Display, derive_more::From)]
pub enum SessionError {
  InvalidMessage,
  SerializationError(serde_json::Error),
  MessageError(database::MessageErrors),
  AmqpError(lapin::Error),
}

pub fn consume_error<T>(result: Result<T, SessionError>) {
  if let Err(e) = result {
    error!("{}", e)
  }
}

// Parse a session request and retrieve the device information
pub fn handle_first_message_from_device(
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

      return Ok(device_info);
    }
    _ => {
      debug!("Received invalid request");
      return Err(SessionError::InvalidMessage);
    }
  }
}

impl WebsocketSession {
  pub async fn from_frame(
    tx: SplitSink<WebSocketStream<TcpStream>, Message>,
    db_client: DatabaseClient,
    frame: Message,
    amqp_channel: &lapin::Channel,
  ) -> Result<WebsocketSession, SessionError> {
    let device_info = match frame {
      Message::Text(payload) => handle_first_message_from_device(&payload)?,
      _ => {
        error!("Client sent wrong frame type for establishing connection");
        return Err(SessionError::InvalidMessage);
      }
    };

    // We don't currently have a use case to interact directly with the queue,
    // however, we need to declare a queue for a given device
    amqp_channel
      .queue_declare(
        &device_info.device_id,
        QueueDeclareOptions::default(),
        FieldTable::default(),
      )
      .await?;

    let amqp_consumer = amqp_channel
      .basic_consume(
        &device_info.device_id,
        "tunnelbroker",
        BasicConsumeOptions::default(),
        FieldTable::default(),
      )
      .await?;

    Ok(WebsocketSession {
      tx,
      db_client,
      device_info,
      amqp_consumer,
    })
  }

  pub async fn handle_websocket_frame_from_device(
    &self,
    msg: Message,
  ) -> Result<(), SessionError> {
    debug!("Received frame: {:?}", msg);

    Ok(())
  }

  pub async fn next_amqp_message(
    &mut self,
  ) -> Option<Result<Delivery, lapin::Error>> {
    self.amqp_consumer.next().await
  }

  pub async fn deliver_persisted_messages(
    &mut self,
  ) -> Result<(), SessionError> {
    // Check for persisted messages
    let messages = self
      .db_client
      .retrieve_messages(&self.device_info.device_id)
      .await
      .unwrap_or_else(|e| {
        error!("Error while retrieving messages: {}", e);
        Vec::new()
      });

    for message in messages {
      let device_message = DeviceMessage::from_hashmap(message)?;
      self.send_message_to_device(device_message.payload).await;
      if let Err(e) = self
        .db_client
        .delete_message(&self.device_info.device_id, &device_message.created_at)
        .await
      {
        error!("Failed to delete message: {}:", e);
      }
    }

    debug!(
      "Flushed messages for device: {}",
      &self.device_info.device_id
    );

    Ok(())
  }

  pub async fn send_message_to_device(&mut self, incoming_payload: String) {
    if let Err(e) = self.tx.send(Message::Text(incoming_payload)).await {
      error!("Failed to send message to device: {}", e);
    }
  }

  // Release websocket and remove from active connections
  pub async fn close(&mut self) {
    if let Err(e) = self.tx.close().await {
      debug!("Failed to close session: {}", e);
    }
  }
}
