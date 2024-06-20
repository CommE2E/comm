//! Message sent from device to Tunnelbroker.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct MessageToTunnelbrokerRequest {
  #[serde(rename = "clientMessageID")]
  pub client_message_id: String,
  pub payload: String,
}
