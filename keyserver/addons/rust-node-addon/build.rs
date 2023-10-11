extern crate napi_build;

use regex::Regex;

use std::env;
use std::fs;
use std::path::Path;

fn main() {
  napi_build::setup();

  let js_path = Path::new("../../../lib/facts/version.js");

  let content =
    fs::read_to_string(&js_path).expect("Failed to read version.js");
  println!("Content of version.js:\n{}", content);

  let version_line = content
    .lines()
    .find(|line| line.contains("webAndKeyserverCodeVersion"))
    .expect("Failed to find webAndKeyserverCodeVersion line");
  println!("Version Line: {}", version_line);

  // Find a sequence in the input string that starts with
  // 'webAndKeyserverCodeVersion', followed by any number of whitespace
  // characters, an equals sign, any number of additional whitespace characters,
  // a series of one or more digits (and capture these digits), and finally a
  // semicolon.
  let re = Regex::new(r"webAndKeyserverCodeVersion\s*=\s*(\d+);").unwrap();
  let version: u64 = re
    .captures(&version_line)
    .and_then(|cap| cap.get(1))
    .map_or_else(
      || panic!("Failed to capture version number"),
      |m| m.as_str().parse::<u64>().unwrap(),
    );

  let out_dir = env::var("OUT_DIR").unwrap();
  let rust_path = Path::new(&out_dir).join("version.rs");

  fs::write(
    &rust_path,
    format!("pub const CODE_VERSION: u64 = {};", version),
  )
  .expect("Failed to write version.rs");
}
