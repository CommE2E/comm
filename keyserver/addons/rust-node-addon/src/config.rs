use serde_json::Value;
use std::env;
use std::fs;
use std::path::PathBuf;

pub enum ConfigName {
  Secrets(String),
  Facts(String),
}

fn get_key_for_config_name(config_name: &ConfigName) -> String {
  match config_name {
    ConfigName::Secrets(name) => format!("secrets_{}", name),
    ConfigName::Facts(name) => format!("facts_{}", name),
  }
}

fn get_path_for_config_name(config_name: &ConfigName) -> PathBuf {
  let folder = match config_name {
    ConfigName::Secrets(_) => "secrets",
    ConfigName::Facts(_) => "facts",
  };
  let name = match config_name {
    ConfigName::Secrets(name) => name,
    ConfigName::Facts(name) => name,
  };
  PathBuf::from(format!("{}/{}.json", folder, name))
}

pub fn get_comm_config(config_name: ConfigName) -> Option<Value> {
  let key = get_key_for_config_name(&config_name);
  let cached = cached_json::get(&key);
  if cached.is_some() {
    return cached;
  }
  let json = get_json(&config_name);
  cached_json::set(&key, &json);
  json
}

mod cached_json {
  use serde_json::Value;
  use std::collections::HashMap;
  use std::sync::RwLock;

  lazy_static::lazy_static! {
      static ref CACHE: RwLock<HashMap<String, Value>> = RwLock::new(HashMap::new());
  }

  pub fn get(key: &str) -> Option<Value> {
    let cache = CACHE.read().unwrap();
    cache.get(key).cloned()
  }

  pub fn set(key: &str, value: &Option<Value>) {
    let mut cache = CACHE.write().unwrap();
    if let Some(val) = value {
      cache.insert(key.to_string(), val.clone());
    }
  }
}

fn get_json(config_name: &ConfigName) -> Option<Value> {
  let key = get_key_for_config_name(config_name);
  let env_key = format!("COMM_JSONCONFIG_{}", key);

  if let Ok(from_env) = env::var(env_key) {
    return serde_json::from_str(&from_env).ok();
  }

  let mut file_path = get_path_for_config_name(config_name);
  if !file_path.starts_with("keyserver") {
    file_path = PathBuf::from(format!("../../{}", file_path.to_str().unwrap()));
  }

  if let Ok(path_string) = fs::read_to_string(file_path) {
    serde_json::from_str(&path_string).ok()
  } else {
    None
  }
}
