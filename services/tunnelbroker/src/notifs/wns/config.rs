use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(clap::Args, Clone, Debug, Deserialize, Serialize)]
pub struct WNSConfig {
  pub tenant_id: String,
  pub app_id: String,
  pub secret: String,
}

impl FromStr for WNSConfig {
  type Err = serde_json::Error;
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    serde_json::from_str(s)
  }
}
