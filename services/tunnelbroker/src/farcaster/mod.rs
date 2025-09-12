use crate::constants::{FARCASTER_REQUEST_TIMEOUT, MEDIA_MIRROR_TIMEOUT};
use crate::database::DatabaseClient;
use crate::farcaster::error::Error::MissingFarcasterToken;
use crate::{amqp_client::amqp::AmqpConnection, config::CONFIG};
use comm_lib::auth::AuthService;
use comm_lib::blob::client::S2SAuthedBlobClient;
use comm_lib::blob::types::http::MirroredMediaInfo;
use lapin::{BasicProperties, ExchangeKind};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use tracing::{debug, info, warn};
use tunnelbroker_messages::farcaster::{APIMethod, FarcasterAPIRequest};

pub mod error;

#[derive(Clone)]
pub struct FarcasterClient {
  farcaster_api_url: reqwest::Url,
  http_client: reqwest::Client,
  db_client: DatabaseClient,
  amqp_connection: AmqpConnection,
  blob_client: S2SAuthedBlobClient,
}

impl FarcasterClient {
  pub fn new(
    farcaster_api_url: reqwest::Url,
    db_client: DatabaseClient,
    amqp_connection: &AmqpConnection,
    auth_service: &AuthService,
  ) -> Result<Self, error::Error> {
    let http_client = reqwest::Client::builder()
      .timeout(FARCASTER_REQUEST_TIMEOUT)
      .build()?;

    Ok(FarcasterClient {
      farcaster_api_url,
      http_client,
      db_client,
      amqp_connection: amqp_connection.clone(),
      blob_client: S2SAuthedBlobClient::new(
        auth_service,
        CONFIG.blob_service_url.clone(),
      ),
    })
  }

  pub async fn api_request(
    &self,
    request: FarcasterAPIRequest,
  ) -> Result<(reqwest::StatusCode, String), error::Error> {
    let endpoint = request.endpoint.clone();
    let (status, response_text) = self.api_request_inner(request).await?;

    if endpoint != "direct-cast-conversation-messages" {
      return Ok((status, response_text));
    }

    let Some((updated_response, medias)) = Self::replace_urls(&response_text)
    else {
      return Ok((status, response_text));
    };
    info!(
      "Found {} medias in payload. Attempting to mirror them to Blob Service.",
      medias.len()
    );

    if let Err(err) = self.mirror_media_to_blob(medias).await {
      if matches!(err, error::Error::Timeout) {
        info!("Timeout when mirroring multimedia. Falling back to originals.");
        return Ok((status, response_text));
      }
      warn!("Failed to mirror multimedia to blob: {err:?}");
      return Ok((status, response_text));
    }

    Ok((status, updated_response))
  }

  async fn mirror_media_to_blob(
    &self,
    medias: Vec<MirroredMediaInfo>,
  ) -> Result<(), error::Error> {
    if medias.is_empty() {
      return Ok(());
    }
    let blob_client = self.blob_client.clone();
    let task = tokio::spawn(async move {
      blob_client.auth().await?.mirror_multimedia(medias).await?;
      Ok::<_, error::Error>(())
    });

    match tokio::time::timeout(MEDIA_MIRROR_TIMEOUT, task).await {
      Ok(Ok(task_result)) => task_result,
      _ => Err(error::Error::Timeout),
    }
  }

  // This fn expects a response from FC `direct-cast-conversation-messages`;
  // specifically, it expects a JSON in form:
  // ```
  // {
  //   result: {
  //     messages: [
  //       {
  //         metadata?: {
  //           medias?: [
  //             { staticRaster: string, ... },
  //             ...
  //           ]
  //         },
  //         ...
  //       },
  //       ...
  //     ]
  //   }
  // }
  // ```
  // It returns `None` when response doesn't match in any way
  fn replace_urls(
    response_text: &str,
  ) -> Option<(String, Vec<MirroredMediaInfo>)> {
    let media_base_url = CONFIG.blob_service_public_url.join("media/").ok()?;

    let mut found_medias: Vec<MirroredMediaInfo> = Vec::new();

    let mut response: serde_json::Value =
      serde_json::from_str(response_text).ok()?;
    let messages = response
      .get_mut("result")?
      .get_mut("messages")?
      .as_array_mut()?;

    for message in messages {
      let Some(medias) = message
        .get_mut("metadata")
        .and_then(|metadata| metadata.get_mut("medias"))
        .and_then(|m| m.as_array_mut())
      else {
        continue;
      };

      for media in medias {
        let original_media = media.clone();
        let Some(url) = media.get_mut("staticRaster") else {
          continue;
        };
        let Some(original_url) = url.as_str() else {
          continue;
        };
        if original_url.starts_with(media_base_url.as_str()) {
          continue;
        }

        let original_metadata = serde_json::to_string(&original_media).ok()?;
        found_medias.push(MirroredMediaInfo {
          url: original_url.to_string(),
          original_metadata,
        });

        let urlencoded_original = urlencoding::encode(original_url);
        let new_url =
          media_base_url.join(&urlencoded_original).ok()?.to_string();
        tracing::trace!(
          "Replaced media URL '{}' with '{}'",
          original_url,
          &new_url
        );
        *url = serde_json::Value::String(new_url);
      }
    }

    let serialized_response = serde_json::to_string(&response).ok()?;
    Some((serialized_response, found_medias))
  }

  pub async fn api_request_inner(
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
      APIMethod::STREAM => {
        tracing::error!(
          "STREAM method should be handled earlier, not in api_request"
        );
        return Err(error::Error::InvalidRequest);
      }
      APIMethod::DELETE => self
        .http_client
        .delete(url)
        .headers(headers)
        .body(request.payload),
    };

    let response = request_builder.send().await?;
    Ok((response.status(), response.text().await?))
  }

  pub async fn handle_stream_request(
    &self,
    request: FarcasterAPIRequest,
  ) -> Result<(), error::Error> {
    debug!("Handling STREAM request for user {}", request.user_id);

    let topic_name = format!("farcaster_user_{}", request.user_id);

    let channel = self.amqp_connection.new_channel().await?;

    // Declare exchange
    channel
      .exchange_declare(
        &topic_name,
        ExchangeKind::Direct,
        lapin::options::ExchangeDeclareOptions::default(),
        lapin::types::FieldTable::default(),
      )
      .await?;

    // Publish the stream message
    channel
      .basic_publish(
        &topic_name,
        "",
        lapin::options::BasicPublishOptions::default(),
        request.payload.as_bytes(),
        BasicProperties::default(),
      )
      .await?;

    debug!(
      "Successfully published stream message to topic: {}",
      topic_name
    );
    Ok(())
  }
}

#[cfg(test)]
mod test {
  #[test]
  fn test_media_blob_url_creation() {
    // part normally handled by service config
    let base_url_str = "https://blob.service.com";
    let base_url: reqwest::Url = base_url_str.parse().unwrap();

    // media url part
    let media_base_url = base_url.join("media/").unwrap();
    assert_eq!(
      media_base_url.as_str(),
      "https://blob.service.com/media/",
      "Media base URL is incorrect"
    );

    // test urlencoding of the original
    let original_url = "https://example.com/image.jpg";
    let original_url_urlencoded = urlencoding::encode(original_url);
    assert_eq!(
      original_url_urlencoded,
      "https%3A%2F%2Fexample.com%2Fimage.jpg",
    );

    // test replaced URL part
    let expected_url =
      format!("{base_url_str}/media/{original_url_urlencoded}");
    let new_url = media_base_url
      .join(&original_url_urlencoded)
      .expect("join failed");
    assert_eq!(expected_url, new_url.as_str(), "URLs don't match");
  }
}
