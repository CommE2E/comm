use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize)]
pub struct FCMMessageWrapper {
  pub message: FCMMessage,
}

/// Message to send by Firebase Cloud Messaging Service.
#[derive(Debug, Serialize)]
pub struct FCMMessage {
  /// Arbitrary key/value payload, which must be UTF-8 encoded.
  pub data: Value,
  /// Target to send a notification/message to.
  pub token: String,
  /// Android specific options for messages sent through FCM connection server.
  pub android: AndroidConfig,
}

#[derive(Debug, Serialize)]
pub struct AndroidConfig {
  /// Message priority. Can take "normal" and "high" values.
  pub priority: AndroidMessagePriority,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "UPPERCASE")]
pub enum AndroidMessagePriority {
  /// Default priority for data messages. Normal priority messages won't
  /// open network connections on a sleeping device, and their delivery
  /// may be delayed to conserve the battery.
  Normal,
  /// Default priority for notification messages. FCM attempts to deliver
  /// high priority messages immediately, allowing the FCM service to wake
  /// a sleeping device when possible and open a network connection to
  /// your app server.
  High,
}

impl AndroidMessagePriority {
  pub fn from_raw(value: &str) -> Option<Self> {
    match value {
      "NORMAL" => Some(AndroidMessagePriority::Normal),
      "HIGH" => Some(AndroidMessagePriority::High),
      _ => None,
    }
  }
}
