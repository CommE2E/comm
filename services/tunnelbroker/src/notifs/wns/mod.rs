pub mod config;

#[derive(Clone)]
pub struct WNSClient {
  http_client: reqwest::Client,
}
