use derive_more::{Display, Error};
use reqwest::StatusCode;

#[derive(PartialEq, Debug, Clone, Display, Error)]
pub struct InvalidArgumentError {
  pub details: String,
}

#[derive(PartialEq, Debug, Display, Error)]
pub enum WNSErrorResponse {
  /// No more information is available about this error.
  UnspecifiedError,

  /// HTTP error code = 400.
  /// One or more headers were specified incorrectly or conflict with another
  /// header.
  BadRequest(InvalidArgumentError),

  /// HTTP error code = 401.
  /// The cloud service did not present a valid authentication ticket.
  Unauthorized,

  /// HTTP error code = 403.
  /// The cloud service is not authorized to send a notification to this URI.
  Forbidden,

  /// HTTP error code = 404.
  /// The channel URI is not valid or is not recognized by WNS.
  NotFound,

  /// HTTP error code = 405.
  /// Invalid method (GET, CREATE); only POST (Windows or Windows Phone) or
  /// DELETE (Windows Phone only) is allowed.
  MethodNotAllowed,

  /// HTTP error code = 406.
  /// The cloud service exceeded its throttle limit.
  NotAcceptable,

  /// HTTP error code = 410.
  /// The channel expired.
  Gone,

  /// HTTP error code = 413.
  /// The notification payload exceeds the 5000 byte size limit.
  RequestEntityTooLarge,

  /// HTTP error code = 500.
  /// An internal failure caused notification delivery to fail.
  InternalServerError,

  /// HTTP error code = 503.
  /// The server is currently unavailable.
  ServiceUnavailable,
}

impl WNSErrorResponse {
  pub fn from_status(status: StatusCode, body: String) -> Self {
    match status {
      StatusCode::BAD_REQUEST => {
        WNSErrorResponse::BadRequest(InvalidArgumentError { details: body })
      }
      StatusCode::UNAUTHORIZED => WNSErrorResponse::Unauthorized,
      StatusCode::FORBIDDEN => WNSErrorResponse::Forbidden,
      StatusCode::NOT_FOUND => WNSErrorResponse::NotFound,
      StatusCode::METHOD_NOT_ALLOWED => WNSErrorResponse::MethodNotAllowed,
      StatusCode::NOT_ACCEPTABLE => WNSErrorResponse::NotAcceptable,
      StatusCode::GONE => WNSErrorResponse::Gone,
      StatusCode::PAYLOAD_TOO_LARGE => WNSErrorResponse::RequestEntityTooLarge,
      StatusCode::INTERNAL_SERVER_ERROR => {
        WNSErrorResponse::InternalServerError
      }
      StatusCode::SERVICE_UNAVAILABLE => WNSErrorResponse::ServiceUnavailable,
      _ => WNSErrorResponse::UnspecifiedError,
    }
  }
  pub fn should_invalidate_token(&self) -> bool {
    matches!(self, WNSErrorResponse::NotFound | WNSErrorResponse::Gone)
  }
}
