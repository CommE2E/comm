use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(clap::Args, Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct APNsConfig {
  pub key: String,
  pub key_id: String,
  pub team_id: String,
  pub production: bool,
}

impl FromStr for APNsConfig {
  type Err = serde_json::Error;
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    serde_json::from_str(s)
  }
}
