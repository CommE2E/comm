use serde::{Deserialize, Serialize};

/// APNs notif built on client.
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

/// FCM notif built on client.
#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct FCMNotif {
  #[serde(rename = "clientMessageID")]
  pub client_message_id: String,
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub data: String,
  pub priority: String,
}
