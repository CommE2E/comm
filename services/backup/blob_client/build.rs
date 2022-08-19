use std::env::current_dir;
use std::path::MAIN_SEPARATOR;
use regex::Regex;

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let _build = cxx_build::bridge("src/lib.rs");
  println!("cargo:rerun-if-changed=src/lib.rs");

  let mut proto_path = "../../../native/cpp/CommonCpp/grpc/protos";
  let is_in_docker_regex = Regex::new(r"^/transferred.*").unwrap();
  if is_in_docker_regex.is_match(&current_dir().unwrap().into_os_string().into_string().unwrap()) {
    proto_path = "../grpc/protos";
  }

  tonic_build::compile_protos(format!("{}/blob.proto", proto_path))?;

  Ok(())
}
