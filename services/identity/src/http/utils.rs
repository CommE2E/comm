use hyper::{header::CONTENT_TYPE, Body, Response};
use std::collections::HashMap;
use tracing::error;

use crate::constants::error_types;

use super::{
  errors::{http500, BoxedError},
  ErrorResponse, HttpRequest, HttpResponse,
};

pub trait RequestExt {
  fn query_string_args(&self) -> HashMap<String, String>;
}

pub trait ResponseExt {
  fn from_json<T: ?Sized + serde::Serialize>(
    response: &T,
  ) -> Result<HttpResponse, ErrorResponse>;
}

impl RequestExt for HttpRequest {
  fn query_string_args(&self) -> HashMap<String, String> {
    let Some(uri_str) = self.uri().query() else {
      return HashMap::new();
    };
    let params: HashMap<_, _> = url::form_urlencoded::parse(uri_str.as_bytes())
      .into_owned()
      .collect();

    tracing::trace!("Found query string args: {:?}", params);
    params
  }
}

impl ResponseExt for Response<Body> {
  fn from_json<T: ?Sized + serde::Serialize>(
    body: &T,
  ) -> Result<HttpResponse, ErrorResponse> {
    let json_string = serde_json::to_string(&body).map_err(|err| {
      error!(
        errorType = error_types::HTTP_LOG,
        "JSON serialization error: {err:?}"
      );
      http500()
    })?;
    let response = Response::builder()
      .header(CONTENT_TYPE, "application/json")
      .body(Body::from(json_string))
      .map_err(|err| ErrorResponse::Err(Box::new(err)))?;
    Ok(response)
  }
}

pub trait IntoServerResponse {
  /// Convenience helper for converting handler return value
  /// into response returned by server future
  fn into_response(self) -> Result<HttpResponse, BoxedError>;
}

impl IntoServerResponse for Result<HttpResponse, ErrorResponse> {
  fn into_response(self) -> Result<HttpResponse, BoxedError> {
    let response = match self {
      Ok(ok_response) => ok_response,
      Err(err_response) => err_response?,
    };
    Ok(response)
  }
}
