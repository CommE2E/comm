use std::fs;
use std::io::Error;

const PROTO_DIR: &'static str = "../../shared/protos";

fn main() -> Result<(), Error> {
  let proto_files = fs::read_dir(PROTO_DIR)?;
  for path in proto_files {
    let filename: String = path?.file_name().to_string_lossy().to_string();

    // Avoid passing non protobuf files to tonic
    if !filename.ends_with(".proto") {
      continue;
    }

    println!("Compiling protobuf file: {}", filename);
    println!("cargo:rerun-if-changed={}/{}", PROTO_DIR, filename);
    tonic_build::compile_protos(format!("{}/{}", PROTO_DIR, filename))?;
  }
  Ok(())
}
