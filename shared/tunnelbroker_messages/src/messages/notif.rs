//! APNs notif built on client.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct APNsNotif {
  pub headers: String,
  #[serde(rename = "clientMessageID")]
  pub client_message_id: String,
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub payload: String,
}
