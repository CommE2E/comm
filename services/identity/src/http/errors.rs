use hyper::{Body, Response, StatusCode};
use tracing::error;

use super::ErrorResponse;
pub use crate::websockets::errors::BoxedError;

pub fn create_error_response(
  code: StatusCode,
  message: &'static str,
) -> ErrorResponse {
  let response = Response::builder().status(code).body(Body::from(message))?;
  Ok(response)
}

pub fn http500() -> ErrorResponse {
  create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "unexpected error")
}

pub fn http400(message: &'static str) -> ErrorResponse {
  create_error_response(StatusCode::BAD_REQUEST, message)
}

pub fn http404(message: &'static str) -> ErrorResponse {
  create_error_response(StatusCode::NOT_FOUND, message)
}

pub fn http405() -> ErrorResponse {
  create_error_response(StatusCode::METHOD_NOT_ALLOWED, "method not allowed")
}

impl From<crate::error::Error> for ErrorResponse {
  fn from(db_error: crate::error::Error) -> Self {
    use crate::constants::error_types;
    use crate::error::DeviceListError;
    use crate::error::Error as DBError;
    use comm_lib::aws::DynamoDBError;

    match db_error {
      DBError::AwsSdk(DynamoDBError::InternalServerError(_))
      | DBError::AwsSdk(
        DynamoDBError::ProvisionedThroughputExceededException(_),
      )
      | DBError::AwsSdk(DynamoDBError::RequestLimitExceeded(_)) => {
        create_error_response(StatusCode::SERVICE_UNAVAILABLE, "please retry")
      }
      DBError::DeviceList(DeviceListError::InvalidDeviceListUpdate) => {
        http400("invalid device list update")
      }
      DBError::DeviceList(DeviceListError::InvalidSignature) => {
        http400("invalid device list signature")
      }
      e => {
        error!(
          errorType = error_types::GENERIC_DB_LOG,
          "Encountered an unexpected error: {}", e
        );
        http500()
      }
    }
  }
}
