use crate::constants::{
  SECRETS_DIRECTORY, SECRETS_FILE_EXTENSION, SECRETS_FILE_NAME,
  SECRETS_SETUP_FILE,
};
use comm_opaque::Cipher;
use opaque_ke::{ciphersuite::CipherSuite, rand::rngs::OsRng};
use std::{env, fs, io, path};

pub fn generate_and_persist_keypair(dir: &str) -> Result<(), io::Error> {
  // Opaque_ke 1.2.0 setup
  let mut rng = OsRng;
  let server_kp = Cipher::generate_random_keypair(&mut rng);
  let mut path = env::current_dir()?;
  path.push(dir);
  if !path.exists() {
    println!("Creating secrets directory {:?}", path);
    fs::create_dir(&path)?;
  }
  path.push(SECRETS_FILE_NAME);
  path.set_extension(SECRETS_FILE_EXTENSION);
  if !path.exists() {
    println!("Writing secret key to {:?}", path);
    fs::write(&path, server_kp.private().to_arr())?;
  } else {
    println!("{:?} already exists, skipping", path);
  }

  // Opaque 2.0 setup
  let server_setup = comm_opaque2::server::generate_server_setup();
  let mut path = path::PathBuf::new();
  path.push(SECRETS_DIRECTORY);
  if !path.exists() {
    println!("Creating secrets directory {:?}", path);
    fs::create_dir(&path)?;
  }
  path.push(SECRETS_SETUP_FILE);
  if path.exists() {
    eprintln!("{:?} already exists, skipping", path);
  } else {
    println!("Writing setup file to {:?}", path);
    fs::write(&path, server_setup.serialize())?;
  }

  Ok(())
}
