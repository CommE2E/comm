use commtest::identity::device::register_user_device;
use commtest::tunnelbroker::socket::create_socket;
use futures_util::{SinkExt, StreamExt};
use serde_json::to_string;
use tokio_tungstenite::tungstenite::Message;
use tunnelbroker_messages::farcaster::{
  APIMethod, FarcasterAPIRequest, FarcasterAPIResponse,
};
use tunnelbroker_messages::{
  DeviceToTunnelbrokerRequestStatus, MessageSentStatus,
};

#[tokio::test]
async fn get_farcaster() {
  let sender = register_user_device(None, None).await;
  let request = FarcasterAPIRequest {
    request_id: "1".to_string(),
    user_id: sender.user_id.clone(),
    api_version: "v2".to_string(),
    endpoint: "direct-cast-conversation-messages".to_string(),
    method: APIMethod::GET,
    payload: "conversationId=efa192faf954b2f8".to_string(),
  };
  let message = to_string(&request).unwrap();

  let mut sender_socket = create_socket(&sender).await.unwrap();
  sender_socket
    .send(Message::Text(message.clone()))
    .await
    .expect("Failed to send message");

  if let Some(Ok(response)) = sender_socket.next().await {
    println!("Got response: {:?}", response);
  };
}
