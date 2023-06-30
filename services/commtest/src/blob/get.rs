use crate::blob::blob_utils::{BlobData, BlobServiceClient};
use crate::tools::Error;

pub async fn run(
  client: &BlobServiceClient,
  blob_data: &BlobData,
) -> Result<Vec<usize>, Error> {
  println!("[{}] get", blob_data.hash);

  let path = format!("/blob/{}", blob_data.hash);
  let url = client.blob_service_url.join(&path)?;
  let response = client.http_client.get(url).send().await?;

  if !response.status().is_success() {
    return Err(Error::HttpStatus(response.status()));
  }

  let bytes = response.bytes().await?;
  let sizes = vec![bytes.len()];
  Ok(sizes)
}
