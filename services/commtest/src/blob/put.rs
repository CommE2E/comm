use std::collections::HashMap;

use reqwest::StatusCode;

use crate::blob::blob_utils::{BlobData, BlobServiceClient};
use crate::tools::{generate_stable_nbytes, Error};

#[derive(serde::Deserialize)]
struct AssignHolderResponse {
  data_exists: bool,
}

#[derive(Debug)]
pub enum PutResult {
  HolderEstablished { data_exists: bool },
  HolderAlreadyExists,
}

impl PutResult {
  pub fn blob_was_uploaded(&self) -> bool {
    match self {
      Self::HolderEstablished { data_exists } => !data_exists,
      _ => false,
    }
  }

  pub fn holder_already_exists(&self) -> bool {
    matches!(self, Self::HolderAlreadyExists)
  }
}

pub async fn run(
  client: &BlobServiceClient,
  blob_data: &BlobData,
) -> Result<PutResult, Error> {
  let url = client.blob_service_url.join("/blob")?;

  let holder = blob_data.holder.clone();
  let blob_hash = blob_data.hash.clone();
  println!("[{}] put holder: {}", &blob_hash, &holder);

  // 1. Assign holder
  let assign_holder_payload =
    HashMap::from([("holder", &holder), ("blob_hash", &blob_hash)]);
  let assign_holder_response = client
    .http_client
    .post(url.clone())
    .json(&assign_holder_payload)
    .send()
    .await?;

  if assign_holder_response.status() == StatusCode::CONFLICT {
    return Ok(PutResult::HolderAlreadyExists);
  }

  let AssignHolderResponse { data_exists } =
    assign_holder_response.json::<_>().await?;

  if data_exists {
    return Ok(PutResult::HolderEstablished { data_exists });
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

  let response = client.http_client.put(url).multipart(parts).send().await?;

  if !response.status().is_success() {
    return Err(Error::HttpStatus(response.status()));
  }

  Ok(PutResult::HolderEstablished { data_exists })
}
