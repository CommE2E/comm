use regex::Regex;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::Path;

const DEFAULT_DEBUG_IDENTITY_SOCKET_ADDR: &str =
  "https://identity.staging.commtechnologies.org:50054";
const DEFAULT_RELEASE_IDENTITY_SOCKET_ADDR: &str =
  "https://identity.commtechnologies.org:50054";
const IDENTITY_SERVICE_CONFIG_PATH: &str =
  "../facts/identity_service_config.json";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdentityServiceConfig {
  identity_socket_addr: String,
}

fn get_identity_service_config(
) -> Result<IdentityServiceConfig, Box<dyn std::error::Error>> {
  let path = Path::new(IDENTITY_SERVICE_CONFIG_PATH);
  let file_content = fs::read_to_string(path)?;

  serde_json::from_str(&file_content).map_err(|e| e.into())
}

fn main() {
  let _cxx_build =
    cxx_build::bridge("src/lib.rs").flag_if_supported("-std=c++17");

  const HEADER_PATH: &str = "../cpp/CommonCpp/NativeModules/CommCoreModule.h";
  let header_path = Path::new(HEADER_PATH);

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
      || panic!("Failed to capture version number"),
      |m| {
        m.as_str()
          .parse::<u64>()
          .expect("Failed to parse version number")
      },
    );

  let out_dir = env::var("OUT_DIR").expect("Error fetching OUT_DIR env var");
  let version_path = Path::new(&out_dir).join("version.rs");

  fs::write(
    version_path,
    format!("pub const CODE_VERSION: u64 = {};", version),
  )
  .expect("Failed to write version.rs");

  let identity_socket_addr = match get_identity_service_config() {
    Ok(config) => config.identity_socket_addr,
    Err(_) => {
      let profile =
        env::var("PROFILE").expect("Error fetching PROFILE env var");
      if profile == "release" {
        DEFAULT_RELEASE_IDENTITY_SOCKET_ADDR.to_string()
      } else {
        DEFAULT_DEBUG_IDENTITY_SOCKET_ADDR.to_string()
      }
    }
  };

  let socket_config_path = Path::new(&out_dir).join("socket_config.rs");

  fs::write(
    socket_config_path,
    format!(
      "pub const IDENTITY_SOCKET_ADDR: &str = \"{}\";",
      identity_socket_addr
    ),
  )
  .expect("Failed to write socket_config.rs");

  println!("cargo:rerun-if-changed=src/lib.rs");
  println!("cargo:rerun-if-changed={}", HEADER_PATH);
  println!("cargo:rerun-if-changed={}", IDENTITY_SERVICE_CONFIG_PATH);
}
