use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(clap::Args, Clone, Debug, Deserialize, Serialize)]
pub struct WebPushConfig {
  pub public_key: String,
  pub private_key: String,
}

impl FromStr for WebPushConfig {
  type Err = serde_json::Error;
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    serde_json::from_str(s)
  }
}
