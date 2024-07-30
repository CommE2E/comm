use derive_more::{Display, Error, From};

#[derive(Debug, From, Display, Error)]
pub enum Error {
  Reqwest(reqwest::Error),
}
