use anyhow::Result;
use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc;
use tonic::transport::Channel;

pub mod protobuff {
  tonic::include_proto!("tunnelbroker");
}
use protobuff::tunnelbroker_service_client::TunnelbrokerServiceClient;

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

pub fn initialize_client(addr: String) -> TunnelbrokerServiceClient<Channel> {
  RUNTIME
    .block_on(TunnelbrokerServiceClient::connect(addr))
    .expect("Failed to connect ot the Tunnelbroker Service")
}

pub async fn publish_message(
  tx: &mpsc::Sender<protobuff::MessageToTunnelbroker>,
  to_device_id: String,
  payload: String,
) -> Result<()> {
  let messages = protobuff::MessageToTunnelbroker {
    data: Some(protobuff::message_to_tunnelbroker::Data::MessagesToSend(
      protobuff::MessagesToSend {
        messages: vec![protobuff::MessageToTunnelbrokerStruct {
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
