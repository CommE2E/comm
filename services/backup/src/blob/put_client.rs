use anyhow::{anyhow, bail, Result};
use tokio::{
  sync::mpsc::{self, Receiver, Sender},
  task::JoinHandle,
};
use tokio_stream::wrappers::ReceiverStream;
use tracing::{instrument, Instrument};

use super::proto;
use crate::constants::MPSC_CHANNEL_BUFFER_CAPACITY;

pub use proto::put_request::Data as PutRequestData;
pub use proto::{PutRequest, PutResponse};

pub struct PutClient {
  req_tx: Sender<proto::PutRequest>,
  res_rx: Receiver<proto::PutResponse>,
  handle: JoinHandle<anyhow::Result<()>>,
}

/// The PutClient instance is a handle holder of a Tokio task running the
/// actual blob client instance. The communication is done via two MPSC
/// channels - one sending requests to the client task, and another for sending
/// responses back to the caller. These messages should go in pairs
/// - one request for one response.
/// The client task can be stopped and awaited for result via the `terminate()`
/// method.
impl PutClient {
  /// Connects to the Blob service and keeps the client connection open
  /// in a separate Tokio task.
  #[instrument(name = "put_client")]
  pub async fn start() -> Result<Self> {
    let service_url = &crate::CONFIG.blob_service_url;
    let mut blob_client =
      proto::blob_service_client::BlobServiceClient::connect(
        service_url.to_string(),
      )
      .await?;
    let (blob_req_tx, blob_req_rx) =
      mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let (blob_res_tx, blob_res_rx) =
      mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let client_thread = async move {
      match blob_client
        .put(tonic::Request::new(ReceiverStream::new(blob_req_rx)))
        .await
      {
        Ok(response) => {
          let mut response_stream = response.into_inner();
          loop {
            match response_stream.message().await? {
              Some(response_message) => {
                // warning: this will produce an error if there's more unread
                // responses than MPSC_CHANNEL_BUFFER_CAPACITY
                // so you should always read the response MPSC channel
                // right after sending a request to dequeue the responses
                // and make room for more.
                // The PutClient::put() function should take care of that
                if let Err(err) = blob_res_tx.try_send(response_message) {
                  bail!(err);
                }
              }
              // Response stream was closed
              None => break,
            }
          }
        }
        Err(err) => {
          bail!(err.to_string());
        }
      };
      Ok(())
    };
    let handle = tokio::spawn(client_thread.in_current_span());

    Ok(PutClient {
      req_tx: blob_req_tx,
      res_rx: blob_res_rx,
      handle,
    })
  }

  /// Sends a [`PutRequest`] to the stream and waits for blob service
  /// to send a response. After all data is sent, the [`PutClient::terminate`]
  /// should be called to end the transmission and handle possible errors.
  pub async fn put(&mut self, req: PutRequest) -> Result<PutResponse> {
    self.req_tx.try_send(req)?;
    self
      .res_rx
      .recv()
      .await
      .ok_or_else(|| anyhow!("Blob client channel closed"))
  }

  /// Closes the connection and awaits the blob client task to finish.
  pub async fn terminate(self) -> Result<()> {
    drop(self.req_tx);
    let thread_result = self.handle.await?;
    thread_result
  }
}
