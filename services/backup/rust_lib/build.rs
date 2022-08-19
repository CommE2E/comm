use std::env::current_dir;
use std::fs;
use std::io::{Error, ErrorKind};

fn list_dir(path: &str) -> Result<(), Box<dyn std::error::Error>> {
  println!("--- scanning path [{}]", path);
  let proto_files = fs::read_dir(path)?;
  for path in proto_files {
    let path_str = path?
      .path()
      .file_name()
      .ok_or(Error::new(
        ErrorKind::Other,
        "failed to obtain the file name",
      ))?
      .to_string_lossy()
      .into_owned();
    println!(" - {}", path_str);
  }
  Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let _build = cxx_build::bridge("src/lib.rs");
  // println!("cargo:rerun-if-changed=src/lib.rs");
  list_dir(".")?;
  list_dir("..")?;
  list_dir("../grpc")?;
  list_dir("../grpc/protos")?; // file exists ../grpc/protos/blob.proto
  // if let Err(e) = tonic_build::compile_protos("../grpc/protos/blob.proto") {
  //   println!("---- PROBLEM {:?}", e);
  // }
  tonic_build::compile_protos("../grpc/protos/blob.proto")?;
  // panic!();
  Ok(())
}
