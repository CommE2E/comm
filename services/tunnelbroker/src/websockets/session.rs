use derive_more;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
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
}

#[derive(Debug, derive_more::Display, derive_more::From)]
pub enum SessionError {
  InvalidMessage,
  SerializationError(serde_json::Error),
  MessageError(database::MessageErrors),
}

pub fn consume_error<T>(result: Result<T, SessionError>) {
  if let Err(e) = result {
    error!("{}", e)
  }
}

// Parse a session request and retreive the device information
pub fn handle_first_message_from_device(
  message: &str,
) -> Result<DeviceInfo, SessionError> {
  let serialized_message = serde_json::from_str::<Messages>(message)?;

  match serialized_message {
    Messages::SessionRequest(mut session_info) => {
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
  pub fn from_frame(
    tx: SplitSink<WebSocketStream<TcpStream>, Message>,
    db_client: DatabaseClient,
    frame: Message,
  ) -> Result<WebsocketSession, SessionError> {
    let device_info = match frame {
      Message::Text(payload) => handle_first_message_from_device(&payload)?,
      _ => {
        error!("Client sent wrong frame type for establishing connection");
        return Err(SessionError::InvalidMessage);
      }
    };

    Ok(WebsocketSession {
      tx,
      db_client,
      device_info,
    })
  }

  pub async fn handle_websocket_frame_from_device(
    &mut self,
    frame: Message,
  ) -> Result<(), SessionError> {
    match frame {
      Message::Text(payload) => {
        debug!("Received message from device: {}", payload);
        Ok(())
      }
      Message::Close(_) => {
        self.close().await;
        Ok(())
      }
      _ => Err(SessionError::InvalidMessage),
    }
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
