use crate::blob::blob_utils::{
  proto::put_request::Data::*, proto::PutRequest, BlobData, BlobServiceClient,
};
use crate::tools::{generate_stable_nbytes, Error};
use tonic::Request;

pub async fn run(
  client: &mut BlobServiceClient<tonic::transport::Channel>,
  blob_data: &BlobData,
) -> Result<bool, Error> {
  let cloned_holder = blob_data.holder.clone();
  let cloned_hash = blob_data.hash.clone();
  let cloned_chunks_sizes = blob_data.chunks_sizes.clone();
  println!("[{}] put", cloned_holder);

  let outbound = async_stream::stream! {
    println!("[{}] - sending holder", cloned_holder);
    let request = PutRequest {
      data: Some(Holder(cloned_holder.to_string())),
    };
    yield request;
    println!("[{}] - sending hash", cloned_holder);
    let request = PutRequest {
      data: Some(BlobHash(cloned_hash.to_string())),
    };
    yield request;
    for chunk_size in cloned_chunks_sizes {
      println!("[{}] - sending data chunk {}", cloned_holder, chunk_size);
      let request = PutRequest {
        data: Some(DataChunk(generate_stable_nbytes(chunk_size, None))),
      };
      yield request;
    }
  };

  let mut data_exists: bool = false;
  let response = client.put(Request::new(outbound)).await?;
  let mut inbound = response.into_inner();
  while let Some(response) = inbound.message().await? {
    data_exists = data_exists || response.data_exists;
  }
  Ok(data_exists)
}
