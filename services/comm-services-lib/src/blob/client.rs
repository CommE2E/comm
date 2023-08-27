use derive_more::{Display, Error, From};
use futures_core::Stream;
use futures_util::{StreamExt, TryStreamExt};
use reqwest::{
  multipart::{Form, Part},
  Body, Method, RequestBuilder,
};
use tracing::{debug, error, trace, warn};

// publicly re-export some reqwest types
pub use reqwest::Error as ReqwestError;
pub use reqwest::StatusCode;
pub use reqwest::Url;

use crate::auth::UserIdentity;

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
  #[display(...)]
  UnexpectedError,
}

/// A client interface to Blob service.
//
/// The `BlobServiceClient` holds a connection pool internally, so it is advised that
/// you create one and **reuse** it, by **cloning**.
///
/// A clone is recommended for each individual client identity, that has
/// a different `UserIdentity`.
///
/// # Example
/// ```ignore
/// // create client for user A
/// let clientA = BlobServiceClient::new(blob_endpoint).with_user_identity(userA);
///
/// // reuse the client connection with different credentials
/// let clientB = clientA.with_user_identity(userB);
///
/// // clientA still uses userA credentials
/// ```
///
/// A clone is recommended when the client concurrently handles multiple identities -
/// e.g. a HTTP service handling requests from different users. The `with_user_identity()`
/// method should be used for this purpose.
///
/// You should **not** wrap the `BlobServiceClient` in an `Rc` or `Arc` to **reuse** it,
/// because it already uses an `Arc` internally.
#[derive(Clone)]
pub struct BlobServiceClient {
  http_client: reqwest::Client,
  blob_service_url: reqwest::Url,
  user_identity: Option<UserIdentity>,
}

impl BlobServiceClient {
  /// Creates a new Blob Service client instance. It is unauthenticated by default
  /// so you need to call `with_user_identity()` afterwards:
  /// ```ignore
  /// let client = BlobServiceClient::new(blob_endpoint).with_user_identity(user);
  /// ```
  ///
  /// **Note**: It is advised to create this client once and reuse by **cloning**.
  /// See [`BlobServiceClient`] docs for details
  pub fn new(blob_service_url: reqwest::Url) -> Self {
    debug!("Creating BlobServiceClient. URL: {}", blob_service_url);
    Self {
      http_client: reqwest::Client::new(),
      blob_service_url,
      user_identity: None,
    }
  }

  /// Clones the client and sets the [`UserIdentity`] for the new instance.
  /// This allows the client to reuse the same connection pool for different users.
  pub fn with_user_identity(&self, user_identity: UserIdentity) -> Self {
    trace!("Set user_identity: {:?}", &user_identity);
    let mut this = self.clone();
    this.user_identity = Some(user_identity);
    this
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
  /// ```ignore
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
      .request(Method::GET, url)?
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

  /// Assigns a new holder to a blob represented by [`blob_hash`].
  /// Returns `BlobServiceError::AlreadyExists` if blob already has
  /// a holder with given [`holder`] name.
  pub async fn assign_holder(
    &self,
    blob_hash: &str,
    holder: &str,
  ) -> BlobResult<bool> {
    debug!("Assign holder request");
    let url = self.get_blob_url(None)?;

    let payload = AssignHolderRequest {
      holder: holder.to_string(),
      blob_hash: blob_hash.to_string(),
    };
    debug!("Request payload: {:?}", payload);
    let response = self
      .request(Method::POST, url)?
      .json(&payload)
      .send()
      .await?;

    debug!("Response status: {}", response.status());
    if response.status().is_success() {
      let AssignHolderResponse { data_exists } = response.json().await?;
      trace!("Data exists: {}", data_exists);
      return Ok(data_exists);
    }

    let error = handle_http_error(response.status());
    if let Ok(message) = response.text().await {
      trace!("Error response message: {}", message);
    }
    Err(error)
  }

  /// Revokes given holder from a blob represented by [`blob_hash`].
  /// Returns `BlobServiceError::NotFound` if blob with given hash does not exist
  /// or it does not have such holder
  pub async fn revoke_holder(
    &self,
    blob_hash: &str,
    holder: &str,
  ) -> BlobResult<()> {
    debug!("Revoke holder request");
    let url = self.get_blob_url(None)?;

    let payload = RevokeHolderRequest {
      holder: holder.to_string(),
      blob_hash: blob_hash.to_string(),
    };
    debug!("Request payload: {:?}", payload);

    let response = self
      .request(Method::DELETE, url)?
      .json(&payload)
      .send()
      .await?;
    debug!("Response status: {}", response.status());

    if response.status().is_success() {
      trace!("Revoke holder request successful");
      return Ok(());
    }

    let error = handle_http_error(response.status());
    if let Ok(message) = response.text().await {
      trace!("Error response message: {}", message);
    }
    Err(error)
  }

  /// Uploads a blob. Returns `BlobServiceError::AlreadyExists` if blob with given hash
  /// already exists.
  ///
  /// # Example
  /// ```ignore
  /// use std::io::{Error, ErrorKind};
  ///
  /// let client =
  ///   BlobServiceClient::new("http://localhost:50053".parse()?);
  ///
  /// let stream = async_stream::stream! {
  ///   yield Ok(vec![1, 2, 3]);
  ///   yield Ok(vec![4, 5, 6]);
  ///   yield Err(Error::new(ErrorKind::Other, "Oops"));
  /// };
  /// client.upload_blob(&blob_hash, stream).await?;
  /// ```
  pub async fn upload_blob<H, S>(
    &self,
    blob_hash: H,
    data_stream: S,
  ) -> BlobResult<()>
  where
    H: Into<String>,
    S: futures_core::stream::TryStream + Send + Sync + 'static,
    S::Error: Into<Box<dyn std::error::Error + Send + Sync>>,
    Vec<u8>: From<S::Ok>,
  {
    debug!("Upload blob request");
    let url = self.get_blob_url(None)?;

    let stream = data_stream.map_ok(Vec::from);
    let streaming_body = Body::wrap_stream(stream);
    let form = Form::new()
      .text("blob_hash", blob_hash.into())
      .part("blob_data", Part::stream(streaming_body));

    let response = self
      .request(Method::PUT, url)?
      .multipart(form)
      .send()
      .await?;
    debug!("Response status: {}", response.status());

    if response.status().is_success() {
      trace!("Blob upload successful");
      return Ok(());
    }

    let error = handle_http_error(response.status());
    if let Ok(message) = response.text().await {
      trace!("Error response message: {}", message);
    }
    Err(error)
  }

  /// A wrapper around [`BlobServiceClient::assign_holder`] and [`BlobServiceClient::upload_blob`].
  ///
  /// Assigns a new holder to a blob represented by [`blob_hash`]. If the blob does not exist,
  /// uploads the data from [`data_stream`].
  pub async fn simple_put<S>(
    &self,
    blob_hash: &str,
    holder: &str,
    data_stream: S,
  ) -> BlobResult<bool>
  where
    S: futures_core::stream::TryStream + Send + Sync + 'static,
    S::Error: Into<Box<dyn std::error::Error + Send + Sync>>,
    Vec<u8>: From<S::Ok>,
  {
    trace!("Begin simple put. Assigning holder...");
    let data_exists = self.assign_holder(blob_hash, holder).await?;
    if data_exists {
      trace!("Blob data already exists. Skipping upload.");
      return Ok(false);
    }
    trace!("Uploading blob data...");
    let Err(upload_error) = self.upload_blob(blob_hash, data_stream).await else {
      return Ok(true);
    };

    trace!(%blob_hash, %holder, "Revoking holder due to upload failure");
    self.schedule_revoke_holder(blob_hash, holder);
    Err(upload_error)
  }

  /// Revokes holder in a separate task. Useful to clean up after
  /// upload failure without blocking the current task.
  pub fn schedule_revoke_holder(
    &self,
    blob_hash: impl Into<String>,
    holder: impl Into<String>,
  ) {
    let this = self.clone();
    let blob_hash: String = blob_hash.into();
    let holder: String = holder.into();
    tokio::spawn(async move {
      if let Err(err) = this.revoke_holder(&blob_hash, &holder).await {
        warn!("Failed to revoke holder: {0:?} - {0}", err);
      }
    });
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

  fn request(
    &self,
    http_method: Method,
    url: Url,
  ) -> BlobResult<RequestBuilder> {
    let request = self.http_client.request(http_method, url);
    match &self.user_identity {
      Some(user) => {
        let token = user.as_authorization_token().map_err(|e| {
          error!("Failed to parse authorization token: {}", e);
          BlobServiceError::UnexpectedError
        })?;
        Ok(request.bearer_auth(token))
      }
      None => Ok(request),
    }
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

#[derive(serde::Deserialize)]
struct AssignHolderResponse {
  data_exists: bool,
}
#[derive(Debug, serde::Serialize)]
struct AssignHolderRequest {
  blob_hash: String,
  holder: String,
}
// they have the same layout so we can simply alias
type RevokeHolderRequest = AssignHolderRequest;
