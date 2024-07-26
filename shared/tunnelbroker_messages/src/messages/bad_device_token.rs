//! Messages to client informing that device token is no longer working.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct BadDeviceToken {
  pub invalidated_token: String,
}
