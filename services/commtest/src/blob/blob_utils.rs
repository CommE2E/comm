#[derive(Clone)]
pub struct BlobServiceClient {
  pub(super) http_client: reqwest::Client,
  pub(super) blob_service_url: reqwest::Url,
}

impl BlobServiceClient {
  pub fn new(blob_service_url: reqwest::Url) -> Self {
    Self {
      http_client: reqwest::Client::new(),
      blob_service_url,
    }
  }
}

#[derive(Clone)]
pub struct BlobData {
  pub holder: String,
  pub hash: String,
  pub chunks_sizes: Vec<usize>,
}
