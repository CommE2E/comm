use crate::constants::FARCASTER_REQUEST_TIMEOUT;

pub mod error;
pub enum APIMethod {
  PUT,
  GET,
  STREAM,
}

pub struct FarcasterAPIRequest {
  /// API version, examples: "v2", "fc"
  pub api_version: String,
  /// Endpoint name
  pub endpoint: String,
  pub method: APIMethod,
  /// Query params, request body, or stream message
  pub payload: String,
}

#[derive(Clone)]
pub struct FarcasterClient {
  farcaster_api_url: reqwest::Url,
  http_client: reqwest::Client,
}

impl FarcasterClient {
  pub fn new(farcaster_api_url: reqwest::Url) -> Result<Self, error::Error> {
    let http_client = reqwest::Client::builder()
      .timeout(FARCASTER_REQUEST_TIMEOUT)
      .build()?;

    Ok(FarcasterClient {
      farcaster_api_url,
      http_client,
    })
  }

  pub async fn api_request(
    &self,
    request: FarcasterAPIRequest,
    query: String,
  ) -> Result<String, error::Error> {
    panic!("not implemented yet");
  }
}
