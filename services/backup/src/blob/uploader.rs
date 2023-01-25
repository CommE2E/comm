use anyhow::{anyhow, bail, Result};
use tokio::{
  sync::mpsc::{self, Receiver, Sender},
  task::JoinHandle,
};
use tokio_stream::wrappers::ReceiverStream;
use tonic::Status;
use tracing::{error, instrument, Instrument};

use super::{proto, BlobClient};
use crate::constants::MPSC_CHANNEL_BUFFER_CAPACITY;

pub use proto::put_request::Data as PutRequestData;
pub use proto::{PutRequest, PutResponse};

pub struct BlobUploader {
  req_tx: Sender<proto::PutRequest>,
  res_rx: Receiver<proto::PutResponse>,
  handle: JoinHandle<anyhow::Result<()>>,
}

/// The BlobUploader instance is a handle holder of a Tokio task running the
/// actual blob client instance. The communication is done via two MPSC
/// channels - one sending requests to the client task, and another for sending
/// responses back to the caller. These messages should go in pairs
/// - one request for one response.
/// The client task can be stopped and awaited for result via the `terminate()`
/// method.
impl BlobUploader {
  /// Connects to the Blob service and keeps the client connection open
  /// in a separate Tokio task.
  #[instrument(name = "blob_uploader")]
  pub async fn start(mut blob_client: BlobClient) -> Result<Self> {
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

    Ok(BlobUploader {
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

  /// Convenience wrapper for
  /// ```
  /// BlobClient::put(PutRequest {
  ///   data: Some(PutRequestData::DataChunk(data))
  /// })
  /// ```
  pub async fn put_data(&mut self, data: Vec<u8>) -> Result<PutResponse> {
    self
      .put(PutRequest {
        data: Some(PutRequestData::DataChunk(data)),
      })
      .await
  }

  /// Closes the connection and awaits the blob client task to finish.
  pub async fn terminate(self) -> Result<()> {
    drop(self.req_tx);
    let thread_result = self.handle.await?;
    thread_result
  }
}

/// Starts a put client instance. Fulfills request with blob hash and holder.
///
/// `None` is returned if given `holder` already exists.
///
/// ## Example
/// ```
/// if let Some(mut client) =
///   start_simple_uploader("my_holder", "my_hash").await? {
///   let my_data = vec![1,2,3,4];
///   let _ = client.put_data(my_data).await;
///
///   let status = client.terminate().await;
/// }
/// ```
pub async fn start_simple_uploader(
  holder: &str,
  blob_hash: &str,
  blob_client: BlobClient,
) -> Result<Option<BlobUploader>, Status> {
  // start client
  let mut uploader = BlobUploader::start(blob_client).await.map_err(|err| {
    error!("Failed to instantiate uploader: {:?}", err);
    Status::aborted("Internal error")
  })?;

  // send holder
  uploader
    .put(PutRequest {
      data: Some(PutRequestData::Holder(holder.to_string())),
    })
    .await
    .map_err(|err| {
      error!("Failed to set blob holder: {:?}", err);
      Status::aborted("Internal error")
    })?;

  // send hash
  let PutResponse { data_exists } = uploader
    .put(PutRequest {
      data: Some(PutRequestData::BlobHash(blob_hash.to_string())),
    })
    .await
    .map_err(|err| {
      error!("Failed to set blob hash: {:?}", err);
      Status::aborted("Internal error")
    })?;

  // Blob with given holder already exists, nothing to do
  if data_exists {
    // the connection is already terminated by server,
    // but it's good to await it anyway
    uploader.terminate().await.map_err(|err| {
      error!("Put client task closed with error: {:?}", err);
      Status::aborted("Internal error")
    })?;
    return Ok(None);
  }
  Ok(Some(uploader))
}
