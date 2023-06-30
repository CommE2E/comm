use std::collections::HashMap;

use crate::blob::blob_utils::{BlobData, BlobServiceClient};
use crate::tools::{generate_stable_nbytes, Error};

#[derive(serde::Deserialize)]
struct AssignHolderResponse {
  data_exists: bool,
}
pub async fn run(
  client: &BlobServiceClient,
  blob_data: &BlobData,
) -> Result<bool, Error> {
  let holder = blob_data.holder.clone();
  let blob_hash = blob_data.hash.clone();
  println!("[{}] put holder: {}", &blob_hash, &holder);

  // 1. Assign holder
  let assign_holder_payload =
    HashMap::from([("holder", &holder), ("blob_hash", &blob_hash)]);
  let assign_holder_response = client
    .http_client
    .post(format!("{}/blob", client.blob_service_url))
    .json(&assign_holder_payload)
    .send()
    .await?;

  let AssignHolderResponse { data_exists } =
    assign_holder_response.json::<_>().await?;

  if data_exists {
    return Ok(data_exists);
  }

  // 2. Upload blob
  let form =
    reqwest::multipart::Form::new().text("blob_hash", blob_hash.clone());
  let parts = blob_data
    .chunks_sizes
    .iter()
    .fold(form, |form, chunk_size| {
      println!("[{}] - adding data chunk {}", &blob_hash, chunk_size);
      form.part(
        "blob_data",
        reqwest::multipart::Part::bytes(generate_stable_nbytes(
          *chunk_size,
          None,
        )),
      )
    });

  let response = client
    .http_client
    .put(format!("{}/blob", client.blob_service_url))
    .multipart(parts)
    .send()
    .await?;

  if !response.status().is_success() {
    return Err(Error::HttpStatus(response.status()));
  }

  Ok(data_exists)
}
