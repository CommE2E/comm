use anyhow::{bail, Result};
use tokio::{
  sync::mpsc::{self, Receiver},
  task::JoinHandle,
};
use tracing::{instrument, Instrument};

use super::proto;
use crate::constants::MPSC_CHANNEL_BUFFER_CAPACITY;

pub use proto::put_request::Data as PutRequestData;
pub use proto::{PutRequest, PutResponse};

/// The BlobDownloader instance is a handle holder of a Tokio task running the
/// actual blob client instance. The communication is done via a MPSC channel
/// and is one-sided - the data is transmitted from the client task to the
/// caller. Blob chunks received in response stream are waiting
/// for the channel to have capacity, so it is recommended to read them quickly
/// to make room for more.
/// The client task can be stopped and awaited for result via the `terminate()`
/// method.
pub struct BlobDownloader {
  rx: Receiver<Vec<u8>>,
  handle: JoinHandle<anyhow::Result<()>>,
}

impl BlobDownloader {
  /// Connects to the Blob service and keeps the client connection open
  /// in a separate Tokio task.
  #[instrument(name = "blob_downloader")]
  pub async fn start(holder: String) -> Result<Self> {
    let service_url = &crate::CONFIG.blob_service_url;
    let mut blob_client =
      proto::blob_service_client::BlobServiceClient::connect(
        service_url.to_string(),
      )
      .await?;
    let (blob_res_tx, blob_res_rx) =
      mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let client_thread = async move {
      let response = blob_client.get(proto::GetRequest { holder }).await?;
      let mut inner_response = response.into_inner();
      loop {
        match inner_response.message().await? {
          Some(data) => {
            let data: Vec<u8> = data.data_chunk;
            if let Err(err) = blob_res_tx.send(data).await {
              bail!(err);
            }
          }
          // Response stream was closed
          None => break,
        }
      }
      Ok(())
    };
    let handle = tokio::spawn(client_thread.in_current_span());

    Ok(BlobDownloader {
      rx: blob_res_rx,
      handle,
    })
  }

  /// Receives the next chunk of blob data if ready or sleeps
  /// until the data is available.
  ///
  /// Returns `None` when the transmission is finished, but this doesn't
  /// determine if it was successful. After receiving `None`, the client
  /// should be consumed by calling [`GetClient::terminate`] to handle
  /// possible errors.
  pub async fn next_chunk(&mut self) -> Option<Vec<u8>> {
    self.rx.recv().await
  }

  /// Stops receiving messages and awaits the client thread to exit
  /// and returns its status.
  pub async fn terminate(mut self) -> Result<()> {
    self.rx.close();
    self.handle.await?
  }
}
