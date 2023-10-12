use regex::Regex;
use std::env;
use std::fs;
use std::path::Path;

fn main() {
  let _cxx_build =
    cxx_build::bridge("src/lib.rs").flag_if_supported("-std=c++17");

  const HEADER_PATH: &str = "../cpp/CommonCpp/NativeModules/CommCoreModule.h";
  println!("cargo:rerun-if-changed={}", HEADER_PATH);
  let header_path = Path::new(HEADER_PATH);

  let content =
    fs::read_to_string(header_path).expect("Failed to read CommCoreModule.h");

  let version_line = content
    .lines()
    .find(|line| line.contains("const int codeVersion"))
    .expect("Failed to find codeVersion line");
  println!("Version line: {}", version_line);

  // The regex searches for the string "const int codeVersion", followed by any
  // number of whitespace characters, an escaped opening curly brace, more
  // optional whitespace, a series of one or more digits (which it captures),
  // some more optional whitespace, an escaped closing curly brace, and finally
  // a semicolon.
  let re = Regex::new(r"const int codeVersion\s*\{\s*(\d+)\s*\};").unwrap();
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

  let out_dir = env::var("OUT_DIR").unwrap();
  let rust_path = Path::new(&out_dir).join("version.rs");

  fs::write(
    rust_path,
    format!("pub const CODE_VERSION: u64 = {};", version),
  )
  .expect("Failed to write version.rs");

  println!("cargo:rerun-if-changed=src/lib.rs");
}
