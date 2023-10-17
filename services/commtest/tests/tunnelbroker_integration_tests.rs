mod proto {
  tonic::include_proto!("tunnelbroker");
}

use commtest::identity::device::create_device;
use commtest::identity::olm_account_infos::{
  MOCK_CLIENT_KEYS_1, MOCK_CLIENT_KEYS_2,
};
use commtest::service_addr;
use commtest::tunnelbroker::socket::create_socket;
use futures_util::{SinkExt, StreamExt};
use proto::tunnelbroker_service_client::TunnelbrokerServiceClient;
use proto::MessageToDevice;
use std::time::Duration;
use tokio::time::sleep;
use tokio_tungstenite::tungstenite::Message;

use tunnelbroker_messages::{
  MessageToDevice as WebsocketMessageToDevice, RefreshKeyRequest,
};

#[tokio::test]
async fn send_refresh_request() {
  // Create session as a keyserver
  let device_info = create_device(None).await;
  let mut socket = create_socket(&device_info).await;

  // Send request for keyserver to refresh keys (identity service)
  let mut tunnelbroker_client =
    TunnelbrokerServiceClient::connect(service_addr::TUNNELBROKER_GRPC)
      .await
      .unwrap();

  let refresh_request = RefreshKeyRequest {
    device_id: device_info.device_id.clone(),
    number_of_keys: 5,
  };

  let payload = serde_json::to_string(&refresh_request).unwrap();
  let request = MessageToDevice {
    device_id: device_info.device_id.clone(),
    payload,
  };
  let grpc_message = tonic::Request::new(request);

  tunnelbroker_client
    .send_message_to_device(grpc_message)
    .await
    .unwrap();

  // Have keyserver receive any websocket messages
  let response = socket.next().await.unwrap().unwrap();

  // Check that message received by keyserver matches what identity server
  // issued
  let serialized_response: RefreshKeyRequest =
    serde_json::from_str(response.to_text().unwrap()).unwrap();
  assert_eq!(serialized_response, refresh_request);
}

#[tokio::test]
async fn test_messages_order() {
  let sender = create_device(Some(&MOCK_CLIENT_KEYS_1)).await;
  let receiver = create_device(Some(&MOCK_CLIENT_KEYS_2)).await;

  let messages = vec![
    WebsocketMessageToDevice {
      device_id: receiver.device_id.clone(),
      payload: "first message".to_string(),
    },
    WebsocketMessageToDevice {
      device_id: receiver.device_id.clone(),
      payload: "second message".to_string(),
    },
    WebsocketMessageToDevice {
      device_id: receiver.device_id.clone(),
      payload: "third message".to_string(),
    },
  ];

  let serialized_messages: Vec<_> = messages
    .iter()
    .map(|message| {
      serde_json::to_string(message)
        .expect("Failed to serialize message to device")
    })
    .map(Message::text)
    .collect();

  let (mut sender_socket, _) = create_socket(&sender).await.split();

  for msg in serialized_messages.clone() {
    sender_socket
      .send(msg)
      .await
      .expect("Failed to send the message over WebSocket");
  }

  // Wait a specified duration to ensure that message had time to persist
  sleep(Duration::from_millis(100)).await;

  let mut receiver_socket = create_socket(&receiver).await;

  for msg in messages {
    if let Some(Ok(response)) = receiver_socket.next().await {
      let received_payload = response.to_text().unwrap();
      assert_eq!(msg.payload, received_payload);
    } else {
      panic!("Unable to receive message");
    }
  }
}
