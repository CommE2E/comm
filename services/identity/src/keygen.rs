use crate::constants::{SECRETS_FILE_EXTENSION, SECRETS_FILE_NAME};
use comm_opaque::Cipher;
use opaque_ke::{ciphersuite::CipherSuite, rand::rngs::OsRng};
use std::{env, fs, io};

pub fn generate_and_persist_keypair(dir: &str) -> Result<(), io::Error> {
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
  if path.exists() {
    println!("{:?} already exists", path);
    return Ok(());
  }
  println!("Writing secret key to {:?}", path);
  fs::write(&path, server_kp.private().to_arr())?;
  Ok(())
}
