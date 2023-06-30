use crate::blob::blob_utils::{BlobData, BlobServiceClient};
use crate::tools::Error;

pub async fn run(
  client: &BlobServiceClient,
  blob_data: &BlobData,
) -> Result<Vec<usize>, Error> {
  println!("[{}] get", blob_data.hash);

  let response = client
    .http_client
    .get(format!(
      "{}/blob/{}",
      client.blob_service_url, blob_data.hash
    ))
    .send()
    .await?;

  if !response.status().is_success() {
    return Err(Error::HttpStatus(response.status()));
  }

  let bytes = response.bytes().await?;
  let sizes = vec![bytes.len()];
  Ok(sizes)
}
