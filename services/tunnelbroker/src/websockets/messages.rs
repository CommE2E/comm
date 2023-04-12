// This file intends to preserve the original structure of the tunnelbroker
// protobuf RPCs. However, this is converted to simple rust datastructures
// to allow for deserialization and serialization into JSON websocket messages

// Original Tunnelbroker Service definition:
//
// service TunnelbrokerService {
//   rpc SessionSignature(SessionSignatureRequest) returns (SessionSignatureResponse) {}
//   rpc NewSession(NewSessionRequest) returns (NewSessionResponse) {}
//   rpc MessagesStream(stream MessageToTunnelbroker) returns (stream MessageToClient) {}
// }

// Session
pub struct SessionSignatureRequest {
  pub device_id: String,
}
pub struct SessionSignatureResponse {
  pub to_sign: String,
}

pub enum DeviceTypes {
  Mobile,
  Web,
  Keyserver,
}

pub struct SessionRequest {
  pub device_id: String,
  pub public_key: String,
  pub signature: String,
  pub notify_token: Option<String>,
  pub device_type: DeviceTypes,
  pub device_app_version: String,
  pub device_os: String,
}

pub struct SessionResponse {
  pub session_id: String,
}

// Common messages structures for the MessagesStream
pub struct ProcessedMessages {
  pub message_id: Vec<String>,
}

// The messages from the Client to the Tunnelbroker
pub struct MessageToTunnelbrokerStruct {
  pub to_device_id: String,
  pub payload: String,
  pub blob_hashes: Vec<String>,
}

pub struct MessagesToSend {
  pub messages: Vec<MessageToTunnelbrokerStruct>,
}

pub enum MessageToTunnelbroker {
  Messages(MessagesToSend),
  ProcessedMessages(ProcessedMessages),
  NewNotifyToken(String),
}

// The messages from the Tunnelbroker to the Client
pub struct MessageToClientStruct {
  pub message_id: String,
  pub from_device_id: String,
  pub payload: String,
  pub blob_hashes: Vec<String>,
}

pub struct MessagesToDeliver {
  pub messages: Vec<MessageToClientStruct>,
}

pub enum MessageToClient {
  Messages(MessagesToDeliver),
  ProcessedMessages(ProcessedMessages),
  NewNotifyTokenRequired,
}
