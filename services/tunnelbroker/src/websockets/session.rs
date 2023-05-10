use tracing::debug;
use tunnelbroker_messages::Messages;

use crate::{
  constants::dynamodb::undelivered_messages::CREATED_AT,
  database::DatabaseClient, ACTIVE_CONNECTIONS,
};

pub struct WebsocketSession {
  tx: tokio::sync::mpsc::UnboundedSender<std::string::String>,
  db_client: DatabaseClient,
}

impl WebsocketSession {
  pub fn new(
    tx: tokio::sync::mpsc::UnboundedSender<std::string::String>,
    db_client: DatabaseClient,
  ) -> WebsocketSession {
    WebsocketSession { tx, db_client }
  }

  pub async fn handle_message_from_device(
    &self,
    message: &str,
  ) -> Result<(), serde_json::Error> {
    match serde_json::from_str::<Messages>(message)? {
      Messages::SessionRequest(session_info) => {
        // TODO: Authenticate device using auth token
        // Check for persisted messages
        let messages = self
          .db_client
          .retrieve_messages(&session_info.device_id)
          .await
          .expect("Failed to retreive messages");

        ACTIVE_CONNECTIONS
          .insert(session_info.device_id.clone(), self.tx.clone());

        for message in messages {
          let payload =
            message.get("payload").unwrap().as_s().unwrap().to_string();
          self
            .tx
            .send(payload)
            .expect("Failed to send message to client");
          let created_at =
            message.get(CREATED_AT).unwrap().as_n().unwrap().to_string();
          self
            .db_client
            .delete_message(&session_info.device_id, &created_at)
            .await
            .expect("Failed to delete messages");
        }

        debug!("Flushed messages for device: {}", &session_info.device_id);
      }
      _ => {
        debug!("Received invalid request");
      }
    }

    Ok(())
  }
}
