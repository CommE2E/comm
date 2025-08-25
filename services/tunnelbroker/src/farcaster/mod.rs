use crate::constants::FARCASTER_REQUEST_TIMEOUT;
use crate::database::DatabaseClient;
use crate::farcaster::error::Error::MissingFarcasterToken;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use tracing::{debug, error};
use tunnelbroker_messages::farcaster::{APIMethod, FarcasterAPIRequest};

pub mod error;

#[derive(Clone)]
pub struct FarcasterClient {
  farcaster_api_url: reqwest::Url,
  http_client: reqwest::Client,
  db_client: DatabaseClient,
}

impl FarcasterClient {
  pub fn new(
    farcaster_api_url: reqwest::Url,
    db_client: DatabaseClient,
  ) -> Result<Self, error::Error> {
    let http_client = reqwest::Client::builder()
      .timeout(FARCASTER_REQUEST_TIMEOUT)
      .build()?;

    Ok(FarcasterClient {
      farcaster_api_url,
      http_client,
      db_client,
    })
  }

  pub async fn api_request(
    &self,
    request: FarcasterAPIRequest,
  ) -> Result<(reqwest::StatusCode, String), error::Error> {
    debug!(
      "Received Farcaster {:?} {} {} request from {}",
      request.method, request.api_version, request.endpoint, request.user_id
    );

    let farcaster_dc_token_response = self
      .db_client
      .get_farcaster_token(&request.user_id)
      .await
      .map_err(error::Error::DatabaseError)?;

    let farcaster_dc_token = match farcaster_dc_token_response {
      Some(token) => token,
      None => return Err(MissingFarcasterToken),
    };

    let mut headers = HeaderMap::new();
    let bearer = format!("Bearer {}", farcaster_dc_token);
    let mut bearer_header = HeaderValue::from_str(&bearer)?;
    bearer_header.set_sensitive(true);
    headers.insert(AUTHORIZATION, bearer_header);
    headers.insert(
      reqwest::header::CONTENT_TYPE,
      HeaderValue::from_static("application/json"),
    );

    let mut url = self.farcaster_api_url.clone();

    // Append path segments
    url
      .path_segments_mut()
      .expect("base URL cannot be base")
      .extend(&[&request.api_version, &request.endpoint]);

    let request_builder = match request.method {
      APIMethod::PUT => self
        .http_client
        .put(url)
        .headers(headers)
        .body(request.payload),
      APIMethod::GET => {
        // Directly append entire string of params
        url.set_query(Some(&request.payload));
        self.http_client.get(url).headers(headers)
      }
      APIMethod::POST => self
        .http_client
        .post(url)
        .headers(headers)
        .body(request.payload),
    };

    let response = request_builder.send().await?;
    Ok((response.status(), response.text().await?))
  }
}
