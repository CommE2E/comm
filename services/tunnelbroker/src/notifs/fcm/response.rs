use derive_more::{Display, Error};
use reqwest::StatusCode;

#[derive(PartialEq, Debug, Clone, Display, Error)]
pub struct InvalidArgumentError {
  pub details: String,
}
#[derive(PartialEq, Debug, Display, Error)]
pub enum FCMErrorResponse {
  /// No more information is available about this error.
  UnspecifiedError,

  /// HTTP error code = 400.
  /// Request parameters were invalid.
  /// Potential causes include invalid registration, invalid package name,
  /// message too big, invalid data key, invalid TTL, or other invalid
  /// parameters.
  InvalidArgument(InvalidArgumentError),

  /// HTTP error code = 404.
  /// App instance was unregistered from FCM. This usually means that
  /// the token used is no longer valid and a new one must be used.
  Unregistered,

  /// HTTP error code = 403.
  /// The authenticated sender ID is different from the sender ID for
  /// the registration token.
  SenderIdMismatch,

  /// HTTP error code = 429.
  /// Sending limit exceeded for the message target.
  QuotaExceeded,

  /// HTTP error code = 503.
  /// The server is overloaded.
  Unavailable,

  /// HTTP error code = 500.
  /// An unknown internal error occurred.
  Internal,

  /// HTTP error code = 401.
  /// APNs certificate or web push auth key was invalid or missing.
  ThirdPartyAuthError,
}
impl FCMErrorResponse {
  pub fn from_status(status: StatusCode, body: String) -> Self {
    match status {
      StatusCode::BAD_REQUEST => {
        FCMErrorResponse::InvalidArgument(InvalidArgumentError {
          details: body,
        })
      }
      StatusCode::NOT_FOUND => FCMErrorResponse::Unregistered,
      StatusCode::FORBIDDEN => FCMErrorResponse::SenderIdMismatch,
      StatusCode::TOO_MANY_REQUESTS => FCMErrorResponse::QuotaExceeded,
      StatusCode::SERVICE_UNAVAILABLE => FCMErrorResponse::Unavailable,
      StatusCode::INTERNAL_SERVER_ERROR => FCMErrorResponse::Internal,
      StatusCode::UNAUTHORIZED => FCMErrorResponse::ThirdPartyAuthError,
      _ => FCMErrorResponse::UnspecifiedError,
    }
  }

  pub fn should_invalidate_token(&self) -> bool {
    matches!(
      self,
      FCMErrorResponse::Unregistered | FCMErrorResponse::InvalidArgument(_)
    )
  }
}
