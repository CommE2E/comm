use bytesize::ByteSize;
use lazy_static::lazy_static;

pub const ATTACHMENT_DELIMITER: &str = ";";

pub const GRPC_METADATA_SIZE_BYTES: usize = 5;

lazy_static! {
  pub static ref DYNAMO_DB_ITEM_SIZE_LIMIT: usize =
    ByteSize::kib(400).as_u64() as usize;
  pub static ref GRPC_CHUNK_SIZE_LIMIT: usize =
    (ByteSize::mib(4).as_u64() as usize) - GRPC_METADATA_SIZE_BYTES;
}
