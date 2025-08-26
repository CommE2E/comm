use serde::{Deserialize, Serialize};

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
