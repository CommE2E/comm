use regex::Regex;
use std::env::current_dir;

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let _build = cxx_build::bridge("src/lib.rs").flag_if_supported("-std=c++17");
  println!("cargo:rerun-if-changed=src/lib.rs");

  let is_in_docker_regex = Regex::new(r"^/transferred.*").unwrap();
  let proto_path = if is_in_docker_regex.is_match(
    &current_dir()
      .unwrap()
      .into_os_string()
      .into_string()
      .unwrap(),
  ) {
    "../grpc/protos"
  } else {
    "../../../native/cpp/CommonCpp/grpc/protos"
  };

  tonic_build::compile_protos(format!("{}/blob.proto", proto_path))?;

  Ok(())
}
