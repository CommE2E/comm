use super::IdentityServiceConfig;
use serde::Deserialize;
use serde_json;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tracing::warn;

pub(super) fn get_identity_service_config(
) -> Result<IdentityServiceConfig, Box<dyn std::error::Error>> {
  const IDENTITY_SERVICE_CONFIG_NAME: ConfigName = ConfigName {
    folder: ConfigFolder::Secrets,
    name: "identity_service_config",
  };
  let config = get_config(&IDENTITY_SERVICE_CONFIG_NAME)?;
  Ok(config)
}

#[derive(Debug)]
enum ConfigFolder {
  Secrets,
  #[allow(dead_code)]
  Facts,
}

impl ConfigFolder {
  fn as_str(&self) -> &'static str {
    match self {
      ConfigFolder::Secrets => "secrets",
      ConfigFolder::Facts => "facts",
    }
  }
}

struct ConfigName {
  folder: ConfigFolder,
  name: &'static str,
}

fn get_key_for_config_name(config_name: &ConfigName) -> String {
  format!(
    "COMM_JSONCONFIG_{}_{}",
    config_name.folder.as_str(),
    config_name.name
  )
}

fn get_path_for_config_name(config_name: &ConfigName) -> PathBuf {
  Path::new(config_name.folder.as_str())
    .join(format!("{}.json", config_name.name))
}

fn get_config<T: for<'de> Deserialize<'de>>(
  config_name: &ConfigName,
) -> Result<T, Box<dyn std::error::Error>> {
  let key = get_key_for_config_name(config_name);

  match env::var(&key) {
    Ok(env_value) => match serde_json::from_str::<T>(&env_value) {
      Ok(config) => return Ok(config),
      Err(e) => {
        warn!("Failed to deserialize env value '{}': {}", env_value, e);
      }
    },
    Err(e) => {
      warn!("Failed to read config from env var '{}': {}", key, e);
    }
  }

  let path = get_path_for_config_name(config_name);
  let file_content = fs::read_to_string(&path).map_err(|e| {
    warn!("Failed to read config file '{}': {}", path.display(), e);
    e
  })?;

  serde_json::from_str::<T>(&file_content).map_err(|e| {
    warn!("Failed to deserialize file content: {}", e);
    e.into()
  })
}
