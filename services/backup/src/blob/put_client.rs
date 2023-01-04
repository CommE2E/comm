use anyhow::Result;
use tokio::{
  sync::mpsc::{Receiver, Sender},
  task::JoinHandle,
};
use tracing::instrument;

use super::proto;
pub use proto::put_request::Data as PutRequestData;
pub use proto::{PutRequest, PutResponse};

pub struct PutClient {
  req_tx: Sender<proto::PutRequest>,
  res_rx: Receiver<proto::PutResponse>,
  handle: JoinHandle<anyhow::Result<()>>,
}

impl PutClient {
  /// Connects to the Blob service and keeps the client connection open
  /// in a separate Tokio task.
  #[instrument(name = "put_client")]
  pub async fn start() -> Result<Self> {
    todo!()
  }

  /// Sends a [`PutRequest`] to the stream and waits for blob service
  /// to send a response. After all data is sent, the [`PutClient::terminate`]
  /// should be called to end the transmission and handle possible errors.
  pub async fn put(&mut self, req: PutRequest) -> Result<PutResponse> {
    todo!()
  }

  /// Closes the connection and awaits the blob client task to finish.
  pub async fn terminate(self) -> Result<()> {
    todo!()
  }
}
