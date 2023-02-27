use lazy_static::lazy_static;
use napi::threadsafe_function::{
  ThreadsafeFunction, ThreadsafeFunctionCallMode,
};
use napi_derive::napi;
use std::env::var;
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};
use tonic::Request;
use tracing::error;

use tunnelbroker::tunnelbroker_pb::message_to_client::Data::MessagesToDeliver;
use tunnelbroker_client as tunnelbroker;

lazy_static! {
  static ref TUNNELBROKER_SERVICE_ADDR: String =
    var("COMM_TUNNELBROKER_SERVICE_ADDR")
      .unwrap_or("https://[::1]:50051".to_string());
}

#[napi(object)]
pub struct MessageToDeliver {
  pub message_id: String,
  pub from_device_id: String,
  pub payload: String,
}

#[napi]
pub struct TunnelbrokerClient {
  tx: mpsc::Sender<tunnelbroker::tunnelbroker_pb::MessageToTunnelbroker>,
}

#[napi]
impl TunnelbrokerClient {
  #[napi(constructor)]
  pub fn new(
    device_id: String,
    on_receive_callback: ThreadsafeFunction<MessageToDeliver>,
  ) -> Self {
    let mut client =
      tunnelbroker::initialize_client(TUNNELBROKER_SERVICE_ADDR.to_string());
    let (tx, rx) = mpsc::channel(1);
    let stream = ReceiverStream::new(rx);

    // Spawning asynchronous Tokio task for handling incoming messages from the client
    // and calling the callback function with the received payload
    tunnelbroker::RUNTIME.spawn({
      async move {
        let mut request = Request::new(stream);
        request.metadata_mut().insert(
          "deviceid",
          device_id.parse().expect("Failed to parse deviceID"),
        );
        let response = client
          .messages_stream(request)
          .await
          .expect("Failed to receive messages stream from Tunnelbroker");
        let mut resp_stream = response.into_inner();
        while let Some(received) = resp_stream.next().await {
          if let Some(message_data) =
            received.expect("Error on getting messages data").data
          {
            match message_data {
              MessagesToDeliver(messages_to_send) => {
                for message in messages_to_send.messages {
                  on_receive_callback.call(
                    Ok(MessageToDeliver {
                      message_id: message.message_id,
                      from_device_id: message.from_device_id,
                      payload: message.payload,
                    }),
                    ThreadsafeFunctionCallMode::NonBlocking,
                  );
                }
              }
              _ => {
                error!("Received an unexpected message type");
              }
            }
          }
        }
      }
    });
    TunnelbrokerClient { tx }
  }

  #[napi]
  pub async fn publish(
    &self,
    to_device_id: String,
    payload: String,
  ) -> napi::Result<()> {
    let messages =
      vec![tunnelbroker::tunnelbroker_pb::MessageToTunnelbrokerStruct {
        to_device_id,
        payload,
        blob_hashes: vec![],
      }];

    if let Err(_) = tunnelbroker::publish_messages(&self.tx, messages).await {
      return Err(napi::Error::from_status(napi::Status::GenericFailure));
    }
    Ok(())
  }
}
