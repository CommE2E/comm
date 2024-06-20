use serde::{Deserialize, Serialize};

/// Message sent by device to set device token.
#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct SetDeviceToken {
  pub device_token: String,
}
