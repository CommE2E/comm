use derive_more;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
use tokio::{net::TcpStream, sync::mpsc::UnboundedSender};
use tokio_tungstenite::{tungstenite::Message, WebSocketStream};
use tracing::{debug, error};
use tunnelbroker_messages::{session::DeviceTypes, Messages};

use crate::{
  database::{self, DatabaseClient, DeviceMessage},
  ACTIVE_CONNECTIONS,
};

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
  device_info: Option<DeviceInfo>,
}

#[derive(Debug, derive_more::Display, derive_more::From)]
pub enum SessionError {
  InvalidMessage,
  SerializationError(serde_json::Error),
  MessageError(database::MessageErrors),
}

fn consume_error<T>(result: Result<T, SessionError>) {
  if let Err(e) = result {
    error!("{}", e)
  }
}
impl WebsocketSession {
  pub fn new(
    tx: SplitSink<WebSocketStream<TcpStream>, Message>,
    db_client: DatabaseClient,
  ) -> WebsocketSession {
    WebsocketSession {
      tx,
      db_client,
      device_info: None,
    }
  }

  pub async fn handle_websocket_frame_from_device(
    &mut self,
    frame: Message,
    tx: UnboundedSender<String>,
  ) {
    debug!("Received message from device: {}", frame);
    let result = match frame {
      Message::Text(payload) => {
        self.handle_message_from_device(&payload, tx).await
      }
      Message::Close(_) => {
        self.close().await;
        Ok(())
      }
      _ => Err(SessionError::InvalidMessage),
    };
    consume_error(result);
  }

  pub async fn handle_message_from_device(
    &mut self,
    message: &str,
    tx: UnboundedSender<String>,
  ) -> Result<(), SessionError> {
    let serialized_message = serde_json::from_str::<Messages>(message)?;

    match serialized_message {
      Messages::SessionRequest(mut session_info) => {
        // TODO: Authenticate device using auth token

        // Check if session request was already sent
        if self.device_info.is_some() {
          return Err(SessionError::InvalidMessage);
        }

        let device_info = DeviceInfo {
          device_id: session_info.device_id.clone(),
          notify_token: session_info.notify_token.take(),
          device_type: session_info.device_type,
          device_app_version: session_info.device_app_version.take(),
          device_os: session_info.device_os.take(),
        };

        // Check for persisted messages
        let messages = self
          .db_client
          .retreive_messages(&device_info.device_id)
          .await
          .unwrap_or_else(|e| {
            error!("Error while retrieving messages: {}", e);
            Vec::new()
          });

        ACTIVE_CONNECTIONS.insert(device_info.device_id.clone(), tx.clone());

        for message in messages {
          let device_message = DeviceMessage::from_hashmap(message)?;
          self.send_message_to_device(device_message.payload).await;
          if let Err(e) = self
            .db_client
            .delete_message(&device_info.device_id, &device_message.created_at)
            .await
          {
            error!("Failed to delete message: {}:", e);
          }
        }

        debug!("Flushed messages for device: {}", &session_info.device_id);

        self.device_info = Some(device_info);
      }
      _ => {
        debug!("Received invalid request");
      }
    }

    Ok(())
  }

  pub async fn send_message_to_device(&mut self, incoming_payload: String) {
    if let Err(e) = self.tx.send(Message::Text(incoming_payload)).await {
      error!("Failed to send message to device: {}", e);
    }
  }

  // Release websocket and remove from active connections
  pub async fn close(&mut self) {
    if let Some(device_info) = &self.device_info {
      ACTIVE_CONNECTIONS.remove(&device_info.device_id);
    }

    if let Err(e) = self.tx.close().await {
      debug!("Failed to close session: {}", e);
    }
  }
}
