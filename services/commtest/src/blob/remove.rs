use std::collections::HashMap;

use crate::blob::blob_utils::BlobData;
use crate::tools::Error;

use super::blob_utils::BlobServiceClient;

pub async fn run(
  client: &BlobServiceClient,
  blob_data: &BlobData,
) -> Result<(), Error> {
  let cloned_holder = blob_data.holder.clone();
  let cloned_blob_hash = blob_data.hash.clone();
  println!("[{}] remove", cloned_holder);

  let request_body =
    HashMap::from([("holder", cloned_holder), ("blob_hash", cloned_blob_hash)]);

  let response = client
    .http_client
    .delete(format!("{}/blob", client.blob_service_url))
    .json(&request_body)
    .send()
    .await?;

  if !response.status().is_success() {
    return Err(Error::HttpStatus(response.status()));
  }

  Ok(())
}
