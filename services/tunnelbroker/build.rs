use cxx_build::CFG;
use glob::glob;
use std::fs;
use std::path::Path;

fn get_cpp_sources(path: &str) -> Vec<String> {
  let mut sources = vec![];
  let files = glob(String::from(path.to_owned() + "/**/*.cpp").as_str())
    .expect("Error gathering .cpp file paths");
  for entry in files {
    sources.push(entry.unwrap().display().to_string());
  }
  sources
}

fn add_import_path(import_path: &str) {
  let shared_headers_import_path =
    fs::canonicalize(import_path).expect("Error getting full import path");
  CFG.exported_header_dirs.push(&shared_headers_import_path);
}

fn main() {
  add_import_path("../lib/src");
  add_import_path("src/libcpp/src");
  add_import_path("src/libcpp/src/Amqp");
  add_import_path("src/libcpp/src/Database");
  add_import_path("src/libcpp/src/DeliveryBroker");
  add_import_path("src/libcpp/src/Tools");

  cxx_build::bridge("src/cxx_bridge.rs")
    .files(get_cpp_sources("../lib/src"))
    .files(get_cpp_sources("src/libcpp/src"))
    .file(Path::new("src/libcpp/Tunnelbroker.cpp"))
    .flag_if_supported("-std=c++17")
    .flag_if_supported("-w")
    .compile("tunnelbroker");

  println!("cargo:rustc-link-lib=boost_program_options");
  println!("cargo:rustc-link-lib=boost_system");
  println!("cargo:rustc-link-lib=folly");
  println!("cargo:rustc-link-lib=double-conversion");
  println!("cargo:rustc-link-lib=gflags");
  println!("cargo:rustc-link-lib=amqpcpp");
  println!("cargo:rustc-link-lib=glog");
  println!("cargo:rustc-link-lib=ssl");
  println!("cargo:rustc-link-lib=uv");
  println!("cargo:rustc-link-lib=aws-cpp-sdk-core");
  println!("cargo:rustc-link-lib=aws-cpp-sdk-dynamodb");

  println!("cargo:rerun-if-changed=src/main.rs");
  println!("cargo:rerun-if-changed=src/libcpp/Tunnelbroker.h");
  println!("cargo:rerun-if-changed=src/libcpp/Tunnelbroker.cpp");

  println!(
    "cargo:rerun-if-changed=../../shared/protos/identity_tunnelbroker.proto"
  );
  tonic_build::configure()
    .build_server(true)
    .build_client(false)
    .compile(
      &["../../shared/protos/identity_tunnelbroker.proto"],
      &["../../shared/protos/"],
    )
    .expect("Failed to compile protobuf file");
}
