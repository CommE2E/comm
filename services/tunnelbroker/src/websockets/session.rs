use tracing::debug;
use tunnelbroker_messages::Messages;

use crate::ACTIVE_CONNECTIONS;

pub struct WebsocketSession {
  tx: tokio::sync::mpsc::UnboundedSender<std::string::String>,
}

impl WebsocketSession {
  pub fn new(
    tx: tokio::sync::mpsc::UnboundedSender<std::string::String>,
  ) -> WebsocketSession {
    WebsocketSession { tx }
  }

  pub fn handle_message_from_device(
    &self,
    message: &str,
  ) -> Result<(), serde_json::Error> {
    match serde_json::from_str::<Messages>(message)? {
      Messages::SessionRequest(session_info) => {
        ACTIVE_CONNECTIONS.insert(session_info.device_id, self.tx.clone());
      }
      _ => {
        debug!("Received invalid request");
      }
    }

    Ok(())
  }
}
