use std::collections::HashSet;
use std::path::PathBuf;
use tokio::fs;

use crate::constants::RESERVED_USERNAMES_JSON;

pub async fn get_reserved_usernames_set() -> Result<HashSet<String>, Error> {
  let path = PathBuf::from(RESERVED_USERNAMES_JSON);
  let contents = fs::read_to_string(path).await?;
  let reserved_usernames: Vec<String> = serde_json::from_str(&contents)?;

  Ok(reserved_usernames.into_iter().collect())
}

#[derive(
  Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
  #[display(...)]
  IO(std::io::Error),
  #[display(...)]
  JSON(serde_json::Error),
}
