extern crate napi_build;

use regex::Regex;

use std::env;
use std::fs;
use std::path::Path;

fn main() {
  napi_build::setup();

  const VERSIONS_JS_PATH: &str = "../../src/version.js";
  println!("cargo:rerun-if-changed={}", VERSIONS_JS_PATH);
  let js_path = Path::new(VERSIONS_JS_PATH);

  let content =
    fs::read_to_string(&js_path).expect("Failed to read version.js");

  let version_line = content
    .lines()
    .find(|line| line.contains("keyserverCodeVersion"))
    .expect("Failed to find keyserverCodeVersion line");

  // Find a sequence in the input string that starts with
  // 'keyserverCodeVersion', followed by any number of whitespace
  // characters, an equals sign, any number of additional whitespace characters,
  // a series of one or more digits (and capture these digits), and finally a
  // semicolon.
  let re = Regex::new(r"keyserverCodeVersion\s*=\s*(\d+);").unwrap();
  let version: u64 = re
    .captures(&version_line)
    .and_then(|cap| cap.get(1))
    .map_or_else(
      || panic!("Failed to capture version number"),
      |m| {
        m.as_str()
          .parse::<u64>()
          .expect("Failed to parse version number")
      },
    );

  let out_dir = env::var("OUT_DIR").unwrap();
  let rust_path = Path::new(&out_dir).join("version.rs");

  fs::write(
    &rust_path,
    format!("pub const CODE_VERSION: u64 = {};", version),
  )
  .expect("Failed to write version.rs");
}
