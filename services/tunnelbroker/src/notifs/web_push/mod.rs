pub mod config;

#[derive(Clone)]
pub struct WebPushClient {
  http_client: reqwest::Client,
}
