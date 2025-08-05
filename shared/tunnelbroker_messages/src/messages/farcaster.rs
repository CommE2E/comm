use serde::{Deserialize, Serialize};
use util_macros::TagAwareDeserialize;

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type")]
pub enum APIMethod {
  PUT,
  GET,
  STREAM,
}

#[derive(Serialize, Deserialize, TagAwareDeserialize, PartialEq, Debug)]
#[serde(tag = "type", remote = "Self", rename_all = "camelCase")]
pub struct FarcasterAPIRequest {
  #[serde(rename = "requestID")]
  pub request_id: String,
  #[serde(rename = "userID")]
  pub user_id: String,
  /// API version, examples: "v2", "fc"
  #[serde(rename = "apiVersion")]
  pub api_version: String,
  pub endpoint: String,
  pub method: APIMethod,
  /// query, body, or stream message
  pub payload: String,
}

#[derive(Serialize, Deserialize, TagAwareDeserialize, PartialEq, Debug)]
#[serde(tag = "type", remote = "Self", rename_all = "camelCase")]
pub struct FarcasterAPIResponseError {
  pub status: u32,
  pub message: String,
}

#[derive(Serialize, PartialEq, Debug)]
#[serde(tag = "type", content = "data")]
pub enum FarcasterAPIResponseData {
  /// JSON stringified response
  Success(String),
  /// ErrorMessage
  ErrorResponse(FarcasterAPIResponseError),
  Error(String),
  /// The request was invalid (e.g., Bytes instead of Text).
  /// In this case, the request ID cannot be retrieved.
  InvalidRequest,
  /// Unauthenticated client tried to send a message.
  Unauthenticated,
  /// The JSON could not be serialized, which is why the entire request is
  /// returned back.
  /// It becomes impossible to retrieve the request ID in such circumstances.
  SerializationError(String),
  MissingFarcasterDCsToken,
}

#[derive(Serialize, TagAwareDeserialize, PartialEq, Debug)]
#[serde(tag = "type", remote = "Self", rename_all = "camelCase")]
pub struct FarcasterAPIResponse {
  #[serde(rename = "requestID")]
  pub request_id: String,
  pub response: FarcasterAPIResponseData,
}
