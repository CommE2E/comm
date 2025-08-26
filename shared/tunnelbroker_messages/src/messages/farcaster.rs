use serde::{Deserialize, Serialize};
use util_macros::TagAwareDeserialize;

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type")]
pub enum APIMethod {
  PUT,
  GET,
  POST,
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

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SenderContext {
  pub display_name: String,
  pub fid: u64,
  pub pfp: ProfilePicture,
  pub username: String,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
pub struct ProfilePicture {
  pub url: String,
  pub verified: bool,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DirectCastMessage {
  pub conversation_id: String,
  pub message: String,
  pub message_id: String,
  pub sender_fid: u64,
  pub server_timestamp: u64,
  #[serde(rename = "type")]
  pub message_type: String,
  pub is_deleted: bool,
  pub sender_context: SenderContext,
  pub reactions: Vec<serde_json::Value>,
  pub has_mention: bool,
  pub is_pinned: bool,
  pub mentions: Vec<serde_json::Value>,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "messageType")]
pub enum FarcasterPayload {
  #[serde(rename = "refresh-direct-cast-conversation")]
  RefreshDirectCastConversation {
    payload: RefreshDirectCastConversationPayload,
    #[serde(flatten)]
    extra: serde_json::Map<String, serde_json::Value>,
  },
  #[serde(rename = "refresh-self-direct-casts-inbox")]
  RefreshSelfDirectCastsInbox {
    payload: RefreshSelfDirectCastsInboxPayload,
    #[serde(flatten)]
    extra: serde_json::Map<String, serde_json::Value>,
  },
  #[serde(rename = "unseen")]
  Unseen {
    data: String,
    #[serde(flatten)]
    extra: serde_json::Map<String, serde_json::Value>,
  },
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RefreshDirectCastConversationPayload {
  pub conversation_id: String,
  pub message: DirectCastMessage,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RefreshSelfDirectCastsInboxPayload {
  pub conversation_id: String,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FarcasterMessage {
  pub message_type: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub payload: Option<serde_json::Value>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub data: Option<String>,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, TagAwareDeserialize, PartialEq, Debug)]
#[serde(tag = "type", remote = "Self", rename_all = "camelCase")]
pub struct NewFarcasterMessage {
  pub message: DirectCastMessage,
}
