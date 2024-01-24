//! Message sent by client to authenticate with Identity Search Server

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct AuthMessage {
  #[serde(rename = "userID")]
  pub user_id: String,
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub access_token: String,
}
