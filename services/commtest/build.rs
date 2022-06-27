use std::fs;
use std::io::{Error, ErrorKind};

fn main() -> Result<(), Error> {
  const PROTO_FILES_PATH: &str = "../../native/cpp/CommonCpp/grpc/protos/";
  let proto_files = fs::read_dir(PROTO_FILES_PATH)?;
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
    assert!(path_str.contains(".proto"));
    tonic_build::compile_protos(format!("{}{}", PROTO_FILES_PATH, path_str))?;
  }
  Ok(())
}
