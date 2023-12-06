use std::{env, fs, path::Path};

use serde::{Deserialize, Serialize};
use tracing::{info, warn};

use crate::constants::DEFAULT_SOCKET_ADDR;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct IdentityServiceConfig {
  pub(super) identity_socket_addr: String,
}

impl Default for IdentityServiceConfig {
  fn default() -> Self {
    Self {
      identity_socket_addr: DEFAULT_SOCKET_ADDR.to_string(),
    }
  }
}

pub(super) fn get_identity_service_config(
) -> Result<IdentityServiceConfig, Box<dyn std::error::Error>> {
  info!(
    "Current working directory is: {}",
    env::current_dir().unwrap().display()
  );
  const IDENTITY_SERVICE_CONFIG_PATH: &str =
    "../facts/identity_service_config.json";

  let path = Path::new(IDENTITY_SERVICE_CONFIG_PATH);
  let file_content = fs::read_to_string(path).map_err(|e| {
    warn!("Failed to read config file '{}': {}", path.display(), e);
    e
  })?;

  serde_json::from_str(&file_content).map_err(|e| {
    warn!("Failed to deserialize file content: {}", e);
    e.into()
  })
}
