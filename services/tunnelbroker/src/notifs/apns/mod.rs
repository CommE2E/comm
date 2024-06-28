pub mod config;

#[derive(Clone)]
pub struct APNsClient {
  http2_client: reqwest::Client,
  is_prod: bool,
}
