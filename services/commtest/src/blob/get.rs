use crate::blob::blob_utils::{BlobData, BlobServiceClient};
use crate::tools::Error;
use reqwest::header::RANGE;
use std::ops::RangeBounds;

pub async fn run(
  client: &BlobServiceClient,
  blob_data: &BlobData,
  range: Option<&impl RangeBounds<i64>>,
) -> Result<Vec<usize>, Error> {
  println!("[{}] get", blob_data.hash);

  let path = format!("/blob/{}", blob_data.hash);
  let url = client.blob_service_url.join(&path)?;
  let parsed_range = match range {
    Some(range) => {
      let start_range = match range.start_bound() {
        std::ops::Bound::Included(start) => start.to_string(),
        std::ops::Bound::Excluded(start) => (start + 1).to_string(),
        std::ops::Bound::Unbounded => "".to_string(),
      };
      let end_range = match range.end_bound() {
        std::ops::Bound::Included(end) => end.to_string(),
        std::ops::Bound::Excluded(end) => (end - 1).to_string(),
        std::ops::Bound::Unbounded => "".to_string(),
      };
      format!("bytes={}-{}", start_range, end_range)
    }
    None => "".to_string(),
  };
  let response = client
    .http_client
    .get(url)
    .header(RANGE, parsed_range)
    .send()
    .await?;

  if !response.status().is_success() {
    return Err(Error::HttpStatus(response.status()));
  }

  let bytes = response.bytes().await?;
  let sizes = vec![bytes.len()];
  Ok(sizes)
}
