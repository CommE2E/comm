use crate::constants::SECRETS_SETUP_FILE;
use base64::{engine::general_purpose, Engine as _};
use std::{fs, io, path};

pub fn generate_and_persist_keypair(dir: &str) -> Result<(), io::Error> {
  let mut secrets_dir = path::PathBuf::new();
  secrets_dir.push(dir);
  if !secrets_dir.exists() {
    println!("Creating secrets directory {:?}", secrets_dir);
    fs::create_dir(&secrets_dir)?;
  }

  // Opaque 2.0 setup
  let server_setup = comm_opaque2::server::generate_server_setup();
  let mut path = secrets_dir.clone();
  path.push(SECRETS_SETUP_FILE);
  if path.exists() {
    eprintln!("{:?} already exists, skipping", path);
  } else {
    println!("Writing setup file to {:?}", path);
    let encoded_server_setup =
      general_purpose::STANDARD_NO_PAD.encode(server_setup.serialize());
    fs::write(&path, encoded_server_setup)?;
  }

  Ok(())
}
