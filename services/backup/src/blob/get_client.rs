use anyhow::Result;
use tokio::{sync::mpsc::Receiver, task::JoinHandle};
use tracing::instrument;

use super::proto;
pub use proto::put_request::Data as PutRequestData;
pub use proto::{PutRequest, PutResponse};

pub struct GetClient {
  rx: Receiver<Vec<u8>>,
  handle: JoinHandle<anyhow::Result<()>>,
}

impl GetClient {
  /// Connects to the Blob service and keeps the client connection open
  /// in a separate Tokio task.
  #[instrument(name = "get_client")]
  pub async fn start(holder: String) -> Result<Self> {
    todo!()
  }

  /// Receives the next chunk of blob data if ready or sleeps
  /// until the data is available.
  ///
  /// Returns `None` when the transmission is finished, but this doesn't
  /// determine if it was successful. After receiving `None`, the client
  /// should be consumed by calling [`GetClient::terminate`] to handle
  /// possible errors.
  pub async fn get(&mut self) -> Option<Vec<u8>> {
    todo!()
  }

  /// Stops receiving messages and awaits the client thread to exit
  /// and returns its status.
  pub async fn terminate(mut self) -> Result<()> {
    todo!()
  }
}
