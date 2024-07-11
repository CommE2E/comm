pub mod config;

#[derive(Clone)]
pub struct FCMClient {
  http2_client: reqwest::Client,
}
