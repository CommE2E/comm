use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(clap::Args, Clone, Debug, Deserialize, Serialize)]
pub struct FCMConfig {
  pub account_type: String,
  pub project_id: String,
  pub private_key_id: String,
  pub private_key: String,
  pub client_email: String,
  pub client_id: String,
  pub auth_uri: String,
  pub token_uri: String,
  pub auth_provider_x509_cert_url: String,
  pub client_x509_cert_url: String,
}

impl FromStr for FCMConfig {
  type Err = serde_json::Error;
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    serde_json::from_str(s)
  }
}
