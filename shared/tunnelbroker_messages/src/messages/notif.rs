use serde::{Deserialize, Serialize};
use util_macros::TagAwareDeserialize;

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

/// WebPush notif built on client.
#[derive(Serialize, Deserialize, TagAwareDeserialize, PartialEq, Debug)]
#[serde(tag = "type", remote = "Self", rename_all = "camelCase")]
pub struct WebPushNotif {
  #[serde(rename = "clientMessageID")]
  pub client_message_id: String,
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub payload: String,
}

/// WNS notif built on client.
#[derive(Serialize, Deserialize, TagAwareDeserialize, PartialEq, Debug)]
#[serde(tag = "type", remote = "Self", rename_all = "camelCase")]
pub struct WNSNotif {
  #[serde(rename = "clientMessageID")]
  pub client_message_id: String,
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub payload: String,
}
