use regex::Regex;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;

#[derive(Clone, Copy, PartialEq, Eq)]
enum ServicesEnvironment {
  Production,
  Staging,
}

impl ServicesEnvironment {
  const CONFIG_FILEPATH: &'static str =
    "../../lib/facts/services-environment.json";
  const ALL_VALUES: [Self; 2] = [Self::Production, Self::Staging];

  fn as_str(self) -> &'static str {
    match self {
      Self::Production => "production",
      Self::Staging => "staging",
    }
  }

  fn expected_values() -> String {
    Self::ALL_VALUES
      .iter()
      .map(|value| value.as_str())
      .collect::<Vec<_>>()
      .join(", ")
  }

  fn from_value(raw_value: &str) -> Option<Self> {
    Self::ALL_VALUES
      .iter()
      .copied()
      .find(|value| value.as_str() == raw_value)
  }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServicesEnvironmentConfig {
  environment: String,
}

fn get_services_environment() -> ServicesEnvironment {
  println!(
    "cargo:rerun-if-changed={}",
    ServicesEnvironment::CONFIG_FILEPATH
  );

  if let Ok(file_content) =
    fs::read_to_string(ServicesEnvironment::CONFIG_FILEPATH)
  {
    let config: ServicesEnvironmentConfig = serde_json::from_str(&file_content)
      .expect("Could not parse services-environment.json");
    let raw_environment = config.environment;
    let expected_values = ServicesEnvironment::expected_values();
    return ServicesEnvironment::from_value(&raw_environment).unwrap_or_else(
      || {
        panic!(
          "Invalid services environment from {}: `{}`. Expected one of: {}",
          ServicesEnvironment::CONFIG_FILEPATH,
          raw_environment,
          expected_values
        )
      },
    );
  }

  ServicesEnvironment::Production
}

trait ServiceConfig: for<'a> Deserialize<'a> {
  const FILEPATH: &'static str;

  fn staging_default() -> Self;
  fn production_default() -> Self;

  fn generated_code(&self) -> String;

  fn get_config(services_environment: ServicesEnvironment) -> Self {
    let path = Path::new(Self::FILEPATH);

    if let Ok(file_content) = fs::read_to_string(path) {
      if let Ok(config) = serde_json::from_str(&file_content) {
        return config;
      }
    }

    if services_environment == ServicesEnvironment::Staging {
      Self::staging_default()
    } else {
      Self::production_default()
    }
  }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdentityServiceConfig {
  identity_socket_addr: String,
}

impl ServiceConfig for IdentityServiceConfig {
  const FILEPATH: &'static str = "../facts/identity_service_config.json";

  fn staging_default() -> Self {
    Self {
      identity_socket_addr:
        "https://identity.staging.commtechnologies.org:50054".to_string(),
    }
  }

  fn production_default() -> Self {
    Self {
      identity_socket_addr: "https://identity.commtechnologies.org:50054"
        .to_string(),
    }
  }

  fn generated_code(&self) -> String {
    format!(
      r#"pub const IDENTITY_SOCKET_ADDR: &str = "{}";"#,
      self.identity_socket_addr
    )
  }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupServiceConfig {
  backup_socket_addr: String,
}

impl ServiceConfig for BackupServiceConfig {
  const FILEPATH: &'static str = "../facts/backup_service_config.json";

  fn staging_default() -> Self {
    Self {
      backup_socket_addr: "https://backup.staging.commtechnologies.org"
        .to_string(),
    }
  }

  fn production_default() -> Self {
    Self {
      backup_socket_addr: "https://backup.commtechnologies.org".to_string(),
    }
  }

  fn generated_code(&self) -> String {
    format!(
      r#"pub const BACKUP_SOCKET_ADDR: &str = "{}";"#,
      self.backup_socket_addr
    )
  }
}

fn get_code_version() -> u64 {
  const HEADER_PATH: &str = "../cpp/CommonCpp/NativeModules/CommCoreModule.h";
  let header_path = Path::new(HEADER_PATH);
  println!("cargo:rerun-if-changed={}", HEADER_PATH);

  let content =
    fs::read_to_string(header_path).expect("Failed to read CommCoreModule.h");

  let version_line = content
    .lines()
    .find(|line| line.contains("const int codeVersion"))
    .expect("Failed to find codeVersion line");

  // The regex searches for the string "const int codeVersion", followed by any
  // number of whitespace characters, an escaped opening curly brace, more
  // optional whitespace, a series of one or more digits (which it captures),
  // some more optional whitespace, an escaped closing curly brace, and finally
  // a semicolon.
  let re = Regex::new(r"const int codeVersion\s*\{\s*(\d+)\s*\};")
    .expect("Failed to compile regular expression");
  let version: u64 = re
    .captures(version_line)
    .and_then(|cap| cap.get(1))
    .map_or_else(
      || panic!("Failed to capture code version number"),
      |m| {
        m.as_str()
          .parse::<u64>()
          .expect("Failed to parse code version number")
      },
    );

  version
}

fn get_state_version() -> u64 {
  const SOURCE_PATH: &str = "../redux/persist-constants.js";
  let source_path = Path::new(SOURCE_PATH);
  println!("cargo:rerun-if-changed={}", SOURCE_PATH);

  let content = fs::read_to_string(source_path)
    .expect("Failed to read persist-constants.js");

  let version_line = content
    .lines()
    .find(|it| it.contains("storeVersion = "))
    .expect("Failed to find storeVersion line");

  // The regex searches for the string "storeVersion =", followed by any
  // number of whitespace characters, a series of one or more digits (which it captures),
  // some more optional whitespace, and finally a semicolon.
  let re = Regex::new(r"storeVersion =\s*(\d+)\s*;")
    .expect("Failed to compile regular expression");
  let version: u64 = re
    .captures(version_line)
    .and_then(|cap| cap.get(1))
    .map_or_else(
      || panic!("Failed to capture state version number"),
      |m| {
        m.as_str()
          .parse::<u64>()
          .expect("Failed to parse state version number")
      },
    );

  version
}

/// Creates version.rs containing CODE_VERSION and STATE_VERSION constants
fn write_version_constants(out_dir: &str) {
  let code_version = get_code_version();
  let state_version = get_state_version();
  let version_path = Path::new(&out_dir).join("version.rs");

  let file_contents = [
    format!("pub const CODE_VERSION: u64 = {};", code_version),
    format!("pub const STATE_VERSION: u64 = {};", state_version),
  ]
  .join("\n");

  fs::write(version_path, file_contents).expect("Failed to write version.rs");
}

fn main() {
  let _cxx_build =
    cxx_build::bridge("src/lib.rs").flag_if_supported("-std=c++17");

  let out_dir = env::var("OUT_DIR").expect("Error fetching OUT_DIR env var");
  write_version_constants(&out_dir);

  let services_environment = get_services_environment();
  let identity_config = IdentityServiceConfig::get_config(services_environment);
  let backup_config = BackupServiceConfig::get_config(services_environment);

  let socket_config_path = Path::new(&out_dir).join("socket_config.rs");

  let mut file = fs::File::create(socket_config_path)
    .expect("Couldn't create services config file");
  file
    .write_all(identity_config.generated_code().as_bytes())
    .expect("Couldn't write identity service config");
  file
    .write_all(backup_config.generated_code().as_bytes())
    .expect("Couldn't write backup service config");

  println!("cargo:rerun-if-changed=src/lib.rs");
  println!("cargo:rerun-if-changed=src/vodozemac.rs");
  println!("cargo:rerun-if-changed={}", IdentityServiceConfig::FILEPATH);
  println!("cargo:rerun-if-changed={}", BackupServiceConfig::FILEPATH);
}
