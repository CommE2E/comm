use anyhow::Result;
use futures_util::stream;
use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc;
use tonic::transport::Channel;
use tunnelbroker::tunnelbroker_service_client::TunnelbrokerServiceClient;

mod tunnelbroker {
  tonic::include_proto!("tunnelbroker");
}

lazy_static! {
  pub static ref RUNTIME: Arc<Runtime> = Arc::new(
    Builder::new_multi_thread()
      .worker_threads(1)
      .max_blocking_threads(1)
      .enable_all()
      .build()
      .unwrap()
  );
}

pub fn initialize_client<T>(
  addr: String,
) -> TunnelbrokerServiceClient<Channel> {
  RUNTIME
    .block_on(TunnelbrokerServiceClient::connect(addr))
    .expect("Failed to create Tokio runtime for the Tunnelbroker client")
}

pub async fn publish_<T>(
  client: &mut TunnelbrokerServiceClient<Channel>,
  to_device_id: String,
  payload: String,
) -> anyhow::Result<()> {
  let messages = vec![tunnelbroker::MessageToTunnelbroker {
    data: Some(tunnelbroker::message_to_tunnelbroker::Data::MessagesToSend(
      tunnelbroker::MessagesToSend {
        messages: vec![tunnelbroker::MessageToTunnelbrokerStruct {
          to_device_id,
          payload,
          blob_hashes: vec![],
        }],
      },
    )),
  }];
  client
    .messages_stream(stream::iter(messages))
    .await
    .expect("Failed to send messages to the Tunnelbroker stream");
  Ok(())
}

pub async fn publish_message(
  tx: &mpsc::Sender<tunnelbroker::MessageToTunnelbroker>,
  to_device_id: String,
  payload: String,
) -> Result<()> {
  let messages = tunnelbroker::MessageToTunnelbroker {
    data: Some(tunnelbroker::message_to_tunnelbroker::Data::MessagesToSend(
      tunnelbroker::MessagesToSend {
        messages: vec![tunnelbroker::MessageToTunnelbrokerStruct {
          to_device_id,
          payload,
          blob_hashes: vec![],
        }],
      },
    )),
  };
  tx.send(messages).await?;
  Ok(())
}
