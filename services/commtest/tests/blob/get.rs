use crate::blob::blob_utils::{proto::GetRequest, BlobData, BlobServiceClient};
use crate::tools::Error;
use tonic::Request;

pub async fn run(
  client: &mut BlobServiceClient<tonic::transport::Channel>,
  blob_data: &BlobData,
) -> Result<Vec<usize>, Error> {
  let cloned_holder = blob_data.holder.clone();
  println!("[{}] get", cloned_holder);

  let response = client
    .get(Request::new(GetRequest {
      holder: cloned_holder,
    }))
    .await?;
  let mut inbound = response.into_inner();
  let mut sizes: Vec<usize> = Vec::new();
  while let Some(response) = inbound.message().await? {
    sizes.push(response.data_chunk.len());
  }
  Ok(sizes)
}
