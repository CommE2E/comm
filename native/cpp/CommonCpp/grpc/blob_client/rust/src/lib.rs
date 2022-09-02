use blob::blob_service_client::BlobServiceClient;
use blob::PutRequest;
use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc;
use tokio::task;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tonic::Request;

pub mod blob {
  tonic::include_proto!("blob");
}

const BLOB_SERVICE_SOCKET_ADDR: &str = "http://localhost:50053";

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

pub struct UploadState {
  sender: mpsc::UnboundedSender<PutRequest>,
  receiver_task: task::JoinHandle<Result<bool, String>>,
}

async fn initialize_upload_state() -> Result<Box<UploadState>, String> {
  let mut client =
    BlobServiceClient::connect(BLOB_SERVICE_SOCKET_ADDR)
      .await
      .map_err(|e| format!("Can't connect to blob service. Details {}", e))?;

  let (sender, receiver) = mpsc::unbounded_channel();
  let request_stream = UnboundedReceiverStream::new(receiver);

  let receiver_task = tokio::spawn(async move {
    // The call below will block until first PutRequest
    // appears in mpsc queue. Therefore we use separate
    // async task to handle queue consumption
    let mut response_stream = client
      .put(Request::new(request_stream))
      .await
      .map_err(|e| {
        format!("Failed to initialize gRPC streaming. Details {}", e)
      })?
      .into_inner();
    let mut data_exists = false;
    while let Some(response) = response_stream.message().await.map_err(|e| {
      format!("Failed to pull response from stream. Details {}", e)
    })? {
      data_exists = data_exists || response.data_exists;
    }
    Ok(data_exists)
  });

  Ok(Box::new(UploadState {
    sender: sender,
    receiver_task: receiver_task,
  }))
}
