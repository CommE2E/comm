use serde::{Deserialize, Serialize};
use util_macros::TagAwareDeserialize;

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type")]
pub enum APIMethod {
  PUT,
  GET,
  POST,
  STREAM,
  DELETE,
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

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SenderContext {
  pub display_name: String,
  pub fid: u64,
  pub pfp: ProfilePicture,
  pub username: String,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct ProfilePicture {
  pub url: String,
  pub verified: bool,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
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

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
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
    #[serde(flatten)]
    extra: serde_json::Map<String, serde_json::Value>,
  },
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RefreshDirectCastConversationPayload {
  pub conversation_id: String,
  pub message: DirectCastMessage,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RefreshSelfDirectCastsInboxPayload {
  pub conversation_id: String,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FarcasterMessage {
  #[serde(flatten)]
  pub payload: FarcasterPayload,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub data: Option<String>,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(
  Serialize, Deserialize, TagAwareDeserialize, PartialEq, Debug, Clone,
)]
#[serde(tag = "type", remote = "Self", rename_all = "camelCase")]
pub struct NewFarcasterMessage {
  pub message: DirectCastMessage,
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_refresh_direct_cast_conversation_parsing() {
    let sample_json = r#"{
      "messageType":"refresh-direct-cast-conversation",
      "payload":{
        "conversationId":"efa192faf954b2f8",
        "message":{
          "conversationId":"efa192faf954b2f8",
          "message":"Test",
          "messageId":"98548a664966761e4903fd6c20476500",
          "senderFid":946308,
          "serverTimestamp":1756219250040,
          "type":"text",
          "isDeleted":false,
          "senderContext":{
            "displayName":"Kamil",
            "fid":946308,
            "pfp":{
              "url":"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/\
                   5ea8b176-f90d-4bcc-480b-5c903b0c7700/rectcrop3",
              "verified":false
            },
            "username":"kamilswm"
          },
          "reactions":[],
          "hasMention":false,
          "isPinned":false,
          "mentions":[]
        }
      },
      "data":"efa192faf954b2f8"
    }"#;

    let parsed_message: FarcasterMessage = serde_json::from_str(sample_json)
      .expect("Should parse the sample message correctly");

    // Verify the data field
    assert_eq!(parsed_message.data, Some("efa192faf954b2f8".to_string()));

    // Verify the payload is parsed correctly
    match parsed_message.payload {
      FarcasterPayload::RefreshDirectCastConversation {
        payload: refresh_payload,
        ..
      } => {
        assert_eq!(refresh_payload.conversation_id, "efa192faf954b2f8");
        assert_eq!(refresh_payload.message.message, "Test");
        assert_eq!(refresh_payload.message.sender_fid, 946308);
        assert_eq!(
          refresh_payload.message.sender_context.display_name,
          "Kamil"
        );
        assert_eq!(refresh_payload.message.sender_context.username, "kamilswm");
      }
      _ => panic!("Expected RefreshDirectCastConversation payload"),
    }
  }

  #[test]
  fn test_refresh_direct_cast_conversation_serialization() {
    // Create a test message
    let test_message = FarcasterMessage {
      payload: FarcasterPayload::RefreshDirectCastConversation {
        payload: RefreshDirectCastConversationPayload {
          conversation_id: "test123".to_string(),
          message: DirectCastMessage {
            conversation_id: "test123".to_string(),
            message: "Hello".to_string(),
            message_id: "msg456".to_string(),
            sender_fid: 123,
            server_timestamp: 1000000,
            message_type: "text".to_string(),
            is_deleted: false,
            sender_context: SenderContext {
              display_name: "Test User".to_string(),
              fid: 123,
              pfp: ProfilePicture {
                url: "https://example.com/pic.jpg".to_string(),
                verified: true,
                extra: serde_json::Map::new(),
              },
              username: "testuser".to_string(),
              extra: serde_json::Map::new(),
            },
            reactions: vec![],
            has_mention: false,
            is_pinned: false,
            mentions: vec![],
            extra: serde_json::Map::new(),
          },
          extra: serde_json::Map::new(),
        },
        extra: serde_json::Map::new(),
      },
      data: Some("test123".to_string()),
      extra: serde_json::Map::new(),
    };

    // Serialize and verify it works
    let serialized =
      serde_json::to_string(&test_message).expect("Should serialize correctly");

    // Verify the serialized JSON contains the expected fields
    assert!(serialized
      .contains("\"messageType\":\"refresh-direct-cast-conversation\""));
    assert!(serialized.contains("\"data\":\"test123\""));
    assert!(serialized.contains("\"conversationId\":\"test123\""));

    // Deserialize back and verify the payload type is correct
    let deserialized: FarcasterMessage =
      serde_json::from_str(&serialized).expect("Should deserialize correctly");

    match deserialized.payload {
      FarcasterPayload::RefreshDirectCastConversation { payload, .. } => {
        assert_eq!(payload.conversation_id, "test123");
        assert_eq!(payload.message.message, "Hello");
      }
      _ => panic!("Expected RefreshDirectCastConversation payload"),
    }
  }

  #[test]
  fn test_unseen_parsing() {
    let unseen_json = r#"{"messageType":"unseen","data":"{\"inboxCount\":1}"}"#;

    let parsed_message: FarcasterMessage = serde_json::from_str(unseen_json)
      .expect("Should parse the unseen message correctly");

    // Verify the data field
    assert_eq!(parsed_message.data, Some("{\"inboxCount\":1}".to_string()));

    // Verify the payload is parsed correctly
    match parsed_message.payload {
      FarcasterPayload::Unseen { .. } => {
        // For unseen messages, the data is in the top-level data field,
        // not in the payload
      }
      _ => panic!("Expected Unseen payload"),
    }
  }

  #[test]
  fn test_refresh_self_direct_casts_inbox_parsing() {
    let inbox_json = r#"{
      "messageType":"refresh-self-direct-casts-inbox",
      "payload":{"conversationId":"efa192faf954b2f8"}
    }"#;

    let parsed_message: FarcasterMessage = serde_json::from_str(inbox_json)
      .expect(
        "Should parse the refresh-self-direct-casts-inbox message correctly",
      );

    // Verify the payload is parsed correctly
    match parsed_message.payload {
      FarcasterPayload::RefreshSelfDirectCastsInbox { payload, .. } => {
        assert_eq!(payload.conversation_id, "efa192faf954b2f8");
      }
      _ => panic!("Expected RefreshSelfDirectCastsInbox payload"),
    }
  }
}
