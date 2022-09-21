use bytesize::ByteSize;
use hex::ToHex;
use lazy_static::lazy_static;
use num_cpus;
use sha2::{Digest, Sha512};
use std::env;

pub fn generate_stable_nbytes(
  number_of_bytes: usize,
  predefined_byte_value: Option<u8>,
) -> Vec<u8> {
  let byte_value = predefined_byte_value.unwrap_or(b'A');
  return vec![byte_value; number_of_bytes];
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  Proto(std::io::Error),
  #[display(...)]
  Tonic(tonic::transport::Error),
  #[display(...)]
  TonicStatus(tonic::Status),
}

pub const GRPC_METADATA_SIZE_BYTES: usize = 5;

lazy_static! {
  pub static ref DYNAMO_DB_ITEM_SIZE_LIMIT: usize =
    ByteSize::kib(400).as_u64() as usize;
  pub static ref GRPC_CHUNK_SIZE_LIMIT: usize =
    (ByteSize::mib(4).as_u64() as usize) - GRPC_METADATA_SIZE_BYTES;
}

pub const ATTACHMENT_DELIMITER: &str = ";";

pub fn obtain_number_of_threads() -> usize {
  let number_of_threads_str: String =
    env::var("COMM_NUMBER_OF_THREADS").unwrap();
  if number_of_threads_str.is_empty() {
    return num_cpus::get();
  }
  return number_of_threads_str.parse::<usize>().unwrap();
}

pub struct DataHasher {
  hasher: Sha512,
}

impl DataHasher {
  pub fn new() -> DataHasher {
    return DataHasher {
      hasher: Sha512::new(),
    };
  }

  pub fn update(data_hasher: &mut DataHasher, bytes: Vec<u8>) {
    data_hasher.hasher.update(bytes);
  }
  pub fn get_hash(self) -> String {
    let hash = self.hasher.finalize();
    return hash.encode_hex::<String>();
  }
}
