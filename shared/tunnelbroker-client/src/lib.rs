use anyhow::Result;
use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc;
use tonic::transport::Channel;

pub mod tunnelbroker_pb {
  tonic::include_proto!("tunnelbroker");
}
use tunnelbroker_pb::tunnelbroker_service_client::TunnelbrokerServiceClient;

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
    .expect("Failed to connect to the Tunnelbroker Service")
}

pub async fn publish_messages(
  tx: &mpsc::Sender<tunnelbroker_pb::MessageToTunnelbroker>,
  messages: Vec<tunnelbroker_pb::MessageToTunnelbrokerStruct>,
) -> Result<()> {
  let messages = tunnelbroker_pb::MessageToTunnelbroker {
    data: Some(
      tunnelbroker_pb::message_to_tunnelbroker::Data::MessagesToSend(
        tunnelbroker_pb::MessagesToSend { messages },
      ),
    ),
  };
  tx.send(messages).await?;
  Ok(())
}
