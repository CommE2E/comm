use opaque_ke::{errors::PakeError, keypair::Key};
use std::{env, fs, io, path::Path};

#[derive(Default, Debug)]
pub struct Config {
  server_secret_key: Option<Key>,
}

impl Config {
  pub fn load() -> Result<Self, Error> {
    let mut path = env::current_dir()?;
    path.push("secrets");
    path.push("secret_key");
    path.set_extension("txt");
    let key = get_key_from_file(path)?;
    Ok(Self {
      server_secret_key: Some(key),
    })
  }
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  Pake(PakeError),
  #[display(...)]
  IO(io::Error),
}

fn get_key_from_file<P: AsRef<Path>>(path: P) -> Result<Key, Error> {
  let bytes = fs::read(path)?;
  Key::from_bytes(&bytes).map_err(|e| Error::Pake(e))
}
