use derive_more::{Display, Error, From};
use futures_core::Stream;
use futures_util::StreamExt;
use reqwest::Url;
use tracing::{debug, trace, warn};

// publicly re-export some reqwest types
pub use reqwest::Error as ReqwestError;
pub use reqwest::StatusCode;

#[derive(From, Error, Debug, Display)]
pub enum BlobServiceError {
  /// HTTP Client errors, this includes:
  /// - connection failures
  /// - request errors (e.g. upload input stream)
  #[display(...)]
  ClientError(ReqwestError),
  /// Invalid Blob service URL provided
  #[display(...)]
  URLError(#[error(ignore)] String),
  /// Blob service returned HTTP 404
  /// - blob or holder not found
  #[display(...)]
  NotFound,
  /// Blob service returned HTTP 409
  /// - blob or holder already exists
  #[display(...)]
  AlreadyExists,
  /// Blob service returned HTTP 400
  /// - invalid holder or blob_hash format
  #[display(...)]
  InvalidArguments,
  /// Blob service returned HTTP 50x
  #[display(...)]
  ServerError,
  #[display(...)]
  UnexpectedHttpStatus(#[error(ignore)] reqwest::StatusCode),
}

/// A client interface to Blob service.
//
/// The `BlobServiceClient` holds a connection pool internally, so it is advised that
/// you create one and **reuse** it, by **cloning**.
///
/// You should **not** wrap the `BlobServiceClient` in an `Rc` or `Arc` to **reuse** it,
/// because it already uses an `Arc` internally.
#[derive(Clone)]
pub struct BlobServiceClient {
  http_client: reqwest::Client,
  blob_service_url: reqwest::Url,
}

impl BlobServiceClient {
  pub fn new(blob_service_url: reqwest::Url) -> Self {
    debug!("Creating BlobServiceClient. URL: {}", blob_service_url);
    Self {
      http_client: reqwest::Client::new(),
      blob_service_url,
    }
  }

  /// Downloads blob with given [`blob_hash`].
  ///
  /// @returns a stream of blob bytes
  ///
  /// # Errors thrown
  /// - [BlobServiceError::NotFound] if blob with given hash does not exist
  /// - [BlobServiceError::InvalidArguments] if blob hash has incorrect format
  ///
  /// # Example
  /// ```rust
  /// let client =
  ///   BlobServiceClient::new("http://localhost:50053".parse()?);
  ///
  /// let mut stream = client.get("hello").await?;
  /// while let Some(data) = stream.try_next().await? {
  ///   println!("Got data: {:?}", data);
  /// }
  /// ```
  pub async fn get(
    &self,
    blob_hash: &str,
  ) -> BlobResult<impl Stream<Item = BlobResult<Vec<u8>>>> {
    debug!(?blob_hash, "Get blob request");
    let url = self.get_blob_url(Some(blob_hash))?;

    let response = self
      .http_client
      .get(url)
      .send()
      .await
      .map_err(BlobServiceError::ClientError)?;

    debug!("Response status: {}", response.status());
    if response.status().is_success() {
      let stream = response.bytes_stream().map(|result| match result {
        Ok(bytes) => Ok(bytes.into()),
        Err(error) => {
          warn!("Error while streaming response: {}", error);
          Err(BlobServiceError::ClientError(error))
        }
      });
      return Ok(stream);
    }

    let error = handle_http_error(response.status());
    if let Ok(message) = response.text().await {
      trace!("Error response message: {}", message);
    }
    Err(error)
  }
}

// private helper methods
impl BlobServiceClient {
  fn get_blob_url(
    &self,
    blob_hash: Option<&str>,
  ) -> Result<Url, BlobServiceError> {
    let path = match blob_hash {
      Some(hash) => format!("/blob/{}", hash),
      None => "/blob".to_string(),
    };
    let url = self
      .blob_service_url
      .join(&path)
      .map_err(|err| BlobServiceError::URLError(err.to_string()))?;
    trace!("Constructed request URL: {}", url);
    Ok(url)
  }
}

fn handle_http_error(status_code: StatusCode) -> BlobServiceError {
  match status_code {
    StatusCode::BAD_REQUEST => BlobServiceError::InvalidArguments,
    StatusCode::NOT_FOUND => BlobServiceError::NotFound,
    StatusCode::CONFLICT => BlobServiceError::AlreadyExists,
    code if code.is_server_error() => BlobServiceError::ServerError,
    code => BlobServiceError::UnexpectedHttpStatus(code),
  }
}

type BlobResult<T> = Result<T, BlobServiceError>;
