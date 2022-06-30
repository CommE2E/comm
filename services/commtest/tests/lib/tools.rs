use bytesize::ByteSize;

#[allow(dead_code)]
pub fn generate_nbytes(number_of_bytes: usize, predefined_byte_value: Option<u8>) -> Vec<u8> {
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

#[allow(dead_code)]
pub const ATTACHMENT_DELIMITER: &str = ";";
