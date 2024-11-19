use derive_more::Error;
use serde::Deserialize;

/// The response body from APNs, only for errors.
/// Apple docs: https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns
#[derive(Deserialize, Debug, PartialEq, Eq, Error)]
pub struct ErrorBody {
  /// The error code (specified as a string) indicating the reason for
  /// the failure.
  pub reason: ErrorReason,

  /// The time, represented in milliseconds since Epoch, at which APNs
  /// confirmed the token was no longer valid for the topic.
  pub timestamp: Option<u64>,
}

impl std::fmt::Display for ErrorBody {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", self.reason)
  }
}

#[derive(Deserialize, Debug, PartialEq, Eq, derive_more::Display, Error)]
pub enum ErrorReason {
  /// The collapse identifier exceeds the maximum allowed size.
  BadCollapseId,

  /// The specified device token was bad. Verify that the request contains a
  /// valid token and that the token matches the environment.
  BadDeviceToken,

  /// The apns-expiration value is invalid.
  BadExpirationDate,

  /// The apns-id value is invalid.
  BadMessageId,

  /// The apns-priority value is invalid.
  BadPriority,

  /// The apns-priority value is invalid.
  BadTopic,

  /// The device token does not match the specified topic.
  DeviceTokenNotForTopic,

  /// One or more headers were repeated.
  DuplicateHeaders,

  /// Idle time out.
  IdleTimeout,

  /// The apns-push-type value is invalid.
  InvalidPushType,

  /// The device token is not specified in the payload.
  MissingDeviceToken,

  /// The apns-topic header of the request isn’t specified and is required.
  /// The apns-topic header is mandatory when the client is connected using
  /// a certificate that supports multiple topics.
  MissingTopic,

  /// The message payload was empty.
  PayloadEmpty,

  /// Pushing to this topic is not allowed.
  TopicDisallowed,

  /// The certificate was bad.
  BadCertificate,

  /// The client certificate was for the wrong environment.
  BadCertificateEnvironment,

  /// The provider token is stale and a new token should be generated.
  ExpiredProviderToken,

  /// The specified action is not allowed.
  Forbidden,

  /// The provider token is not valid or the token signature could
  /// not be verified.
  InvalidProviderToken,

  ///No provider certificate was used to connect to APNs, and the
  /// authorization header is missing or no provider token is specified.
  MissingProviderToken,

  /// The request path value is bad.
  BadPath,

  /// The request method was not `POST`.
  MethodNotAllowed,

  /// The device token has expired.
  ExpiredToken,

  /// The device token is inactive for the specified topic.
  Unregistered,

  /// The message payload was too large.
  PayloadTooLarge,

  /// The provider token is being updated too often.
  TooManyProviderTokenUpdates,

  /// Too many requests were made consecutively to the same device token.
  TooManyRequests,

  /// An internal server error occurred.
  InternalServerError,

  /// The service is unavailable.
  ServiceUnavailable,

  /// The server is shutting down.
  Shutdown,
}

impl ErrorReason {
  pub fn should_invalidate_token(&self) -> bool {
    matches!(
      self,
      ErrorReason::BadDeviceToken
        | ErrorReason::Unregistered
        | ErrorReason::ExpiredToken
    )
  }
}
