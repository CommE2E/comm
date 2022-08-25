use blob::blob_service_client::BlobServiceClient;
use blob::{put_request::Data, GetRequest, PutRequest};

use lazy_static::lazy_static;
use std::error::Error;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tonic::Request;

pub mod blob {
  tonic::include_proto!("blob");
}

const BLOB_SERVICE_SOCKET_ADDR: &str = "http://localhost:50053";

lazy_static! {
  pub static ref RUNTIME: Arc<Runtime> = Arc::new(Runtime::new().unwrap());
}

#[cxx::bridge]
mod ffi {
  struct BlobData {
    raw_data: Vec<u8>,
    chunk_sizes: Vec<usize>,
  }

  extern "Rust" {
    fn put_blob_sync(
      holder: String,
      hash: String,
      data: Box<BlobData>,
    ) -> Result<bool>;

    fn get_blob_sync(holder: String) -> Result<BlobData>;
  }
}

pub async fn put_blob(
  holder: String,
  hash: String,
  data: Box<ffi::BlobData>,
) -> Result<bool, Box<dyn Error>> {
  let request_stream = async_stream::stream! {
    yield PutRequest {data: Some(Data::Holder(holder.clone()))};
    yield PutRequest {data: Some(Data::BlobHash(hash.clone()))};
    let mut start_idx = 0;
    for chunk_size in &data.chunk_sizes {
      let data_chunk = data.raw_data[start_idx..(start_idx + chunk_size - 1)].to_vec();
      start_idx += chunk_size;
      yield PutRequest {data: Some(Data::DataChunk(data_chunk))};
    }
  };

  let mut client = BlobServiceClient::connect(BLOB_SERVICE_SOCKET_ADDR).await?;
  let mut response_stream =
    client.put(Request::new(request_stream)).await?.into_inner();

  let mut data_exists = false;
  while let Some(response) = response_stream.message().await? {
    data_exists = data_exists || response.data_exists;
  }
  Ok(data_exists)
}

pub async fn get_blob(holder: String) -> Result<ffi::BlobData, Box<dyn Error>> {
  let request = GetRequest {
    holder: holder.clone(),
  };
  let mut client = BlobServiceClient::connect("").await?;
  let mut response_stream =
    client.get(Request::new(request)).await?.into_inner();

  let mut raw_data = Vec::new();
  let mut chunk_sizes = Vec::new();

  while let Some(response) = response_stream.message().await? {
    raw_data.extend_from_slice(&response.data_chunk[..]);
    chunk_sizes.push(response.data_chunk.len());
  }
  Ok(ffi::BlobData {
    raw_data: raw_data,
    chunk_sizes: chunk_sizes,
  })
}

pub fn put_blob_sync(
  holder: String,
  hash: String,
  data: Box<ffi::BlobData>,
) -> Result<bool, Box<dyn Error>> {
  RUNTIME.block_on(put_blob(holder, hash, data))
}

pub fn get_blob_sync(holder: String) -> Result<ffi::BlobData, Box<dyn Error>> {
  RUNTIME.block_on(get_blob(holder))
}
