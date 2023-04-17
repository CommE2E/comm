use std::collections::HashSet;
use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

use crate::constants::RESERVED_USERNAMES_JSON;

async fn get_reserved_usernames_set() -> Result<HashSet<String>, Error> {
  let path = PathBuf::from(RESERVED_USERNAMES_JSON);
  let contents = fs::read_to_string(path).await?;
  let reserved_usernames: Vec<String> = serde_json::from_str(&contents)?;

  Ok(reserved_usernames.into_iter().collect())
}

pub async fn username_reserved(username: &str) -> Result<bool, Error> {
  let reserved_usernames = get_reserved_usernames_set().await?;
  Ok(reserved_usernames.contains(username))
}

pub fn generate_uuid() -> String {
  let mut buf = [b'\0'; 36];
  Uuid::new_v4().hyphenated().encode_upper(&mut buf);
  std::str::from_utf8(&buf)
    .expect("Unable to create UUID")
    .to_string()
}

#[derive(
  Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
  #[display(...)]
  IO(std::io::Error),
  #[display(...)]
  Json(serde_json::Error),
}

#[cfg(test)]
mod tests {
  use super::*;
  #[test]
  fn test_generate_uuid() {
    generate_uuid();
  }
}
