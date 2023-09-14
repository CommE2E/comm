mod client {
  tonic::include_proto!("identity.client");
}
mod auth_proto {
  tonic::include_proto!("identity.authenticated");
}
use auth_proto::identity_client_service_client::IdentityClientServiceClient as AuthClient;
use client::identity_client_service_client::IdentityClientServiceClient;
use client::UploadOneTimeKeysRequest;
use commtest::identity::device::create_device;
use futures_util::StreamExt;
use futures_util::{SinkExt, TryStreamExt};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tonic::transport::Endpoint;
use tonic::Request;
use tunnelbroker_messages::{
  ConnectionInitializationMessage, DeviceTypes, RefreshKeyRequest,
};

#[tokio::test]
#[should_panic]
async fn test_tunnelbroker_invalid_auth() {
  let (mut socket, _) = connect_async("ws://localhost:51001")
    .await
    .expect("Can't connect");

  let session_request = ConnectionInitializationMessage {
    device_id: "".to_string(),
    access_token: "".to_string(),
    user_id: "".to_string(),
    notify_token: None,
    device_type: DeviceTypes::Keyserver,
    device_app_version: None,
    device_os: None,
  };

  let serialized_request = serde_json::to_string(&session_request)
    .expect("Failed to serialize connection request");

  socket
    .send(Message::Text(serialized_request))
    .await
    .expect("Failed to send message");

  socket.next().await.unwrap().unwrap();
}

#[tokio::test]
async fn test_tunnelbroker_valid_auth() {
  let (mut socket, _) = connect_async("ws://localhost:51001")
    .await
    .expect("Can't connect");

  let device_info = create_device().await;
  let session_request = ConnectionInitializationMessage {
    device_id: device_info.device_id.to_string(),
    access_token: device_info.access_token.to_string(),
    user_id: device_info.user_id.to_string(),
    notify_token: None,
    device_type: DeviceTypes::Keyserver,
    device_app_version: None,
    device_os: None,
  };

  let serialized_request = serde_json::to_string(&session_request)
    .expect("Failed to serialize connection request");

  socket
    .send(Message::Text(serialized_request))
    .await
    .expect("Failed to send message");

  socket.next().await.unwrap().unwrap();
}

#[tokio::test]
async fn test_refresh_keys_request_upon_depletion() {
  let device_info = create_device().await;

  let mut identity_client =
    IdentityClientServiceClient::connect("http://127.0.0.1:50054")
      .await
      .expect("Couldn't connect to identitiy service");

  let upload_request = UploadOneTimeKeysRequest {
    user_id: device_info.user_id.clone(),
    device_id: device_info.device_id.clone(),
    access_token: device_info.access_token.clone(),
    content_one_time_pre_keys: vec!["content1".to_string()],
    notif_one_time_pre_keys: vec!["notif1".to_string()],
  };

  identity_client
    .upload_one_time_keys(upload_request)
    .await
    .unwrap();

  // Request outbound keys, which should trigger identity service to ask for more keys
  let channel = Endpoint::from_static("http://[::1]:50054")
    .connect()
    .await
    .unwrap();

  let mut client =
    AuthClient::with_interceptor(channel, |mut inter_request: Request<()>| {
      let metadata = inter_request.metadata_mut();
      metadata.insert("user_id", device_info.user_id.parse().unwrap());
      metadata.insert("device_id", device_info.device_id.parse().unwrap());
      metadata
        .insert("access_token", device_info.access_token.parse().unwrap());
      Ok(inter_request)
    });

  let keyserver_request = auth_proto::OutboundKeysForUserRequest {
    user_id: device_info.user_id.clone(),
  };

  println!("Getting keyserver info for user, {}", device_info.user_id);
  let first_reponse = client
    .get_keyserver_keys(keyserver_request.clone())
    .await
    .expect("Second keyserver keys request failed")
    .into_inner()
    .keyserver_info
    .unwrap();

  // The current threshold is 5, but we only upload two. Should receive request
  // from tunnelbroker to refresh keys
  // Create session as a keyserver

  let (mut socket, _) = connect_async("ws://localhost:51001")
    .await
    .expect("Can't connect");

  let session_request = ConnectionInitializationMessage {
    device_id: device_info.device_id.to_string(),
    access_token: device_info.access_token.to_string(),
    user_id: device_info.user_id.to_string(),
    notify_token: None,
    device_type: DeviceTypes::Keyserver,
    device_app_version: None,
    device_os: None,
  };

  let serialized_request = serde_json::to_string(&session_request)
    .expect("Failed to serialize connection request");

  socket
    .send(Message::Text(serialized_request))
    .await
    .expect("Failed to send message");

  // Have keyserver receive any websocket messages
  if let Some(Ok(response)) = socket.next().await {
    // Check that message received by keyserver matches what identity server
    // issued
    let serialized_response: RefreshKeyRequest =
      serde_json::from_str(&response.to_text().unwrap()).unwrap();

    let expected_response = RefreshKeyRequest {
      device_id: device_info.device_id.to_string(),
      number_of_keys: 5,
    };
    assert_eq!(serialized_response, expected_response);
  };
}
