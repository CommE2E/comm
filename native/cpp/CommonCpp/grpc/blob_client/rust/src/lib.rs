use blob::blob_service_client::BlobServiceClient;
use blob::{put_request::Data, PutRequest};
use lazy_static::lazy_static;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc;
use tokio::task;
use tokio_stream::wrappers::ReceiverStream;
use tonic::Request;

pub mod blob {
  tonic::include_proto!("blob");
}

const PUT_REQUEST_BUFFER_SIZE: usize = 10;
const BLOB_SERVICE_SOCKET_ADDR: &str = "http://localhost:50053";

lazy_static! {
  pub static ref RUNTIME: Runtime = Builder::new_multi_thread()
    .worker_threads(1)
    .max_blocking_threads(1)
    .enable_all()
    .build()
    .unwrap();
}

pub struct UploadState {
  sender: mpsc::Sender<PutRequest>,
  receiver_task: task::JoinHandle<Result<bool, String>>,
}

async fn initialize_upload_state() -> Result<Box<UploadState>, String> {
  let mut client =
    BlobServiceClient::connect(BLOB_SERVICE_SOCKET_ADDR)
      .await
      .map_err(|e| format!("Can't connect to blob service. Details {}", e))?;

  let (sender, receiver) = mpsc::channel(PUT_REQUEST_BUFFER_SIZE);
  let request_stream = ReceiverStream::new(receiver);

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

async fn start_upload(
  state: &mut Box<UploadState>,
  holder: String,
  hash: String,
) -> Result<(), String> {
  let holder_request = PutRequest {
    data: Some(Data::Holder(holder.clone())),
  };
  let hash_request = PutRequest {
    data: Some(Data::BlobHash(hash.clone())),
  };
  state
    .sender
    .send(holder_request)
    .await
    .map_err(|e| format!("Failed to send request. Details {}", e))?;
  state
    .sender
    .send(hash_request)
    .await
    .map_err(|e| format!("Failed to send request. Details {}", e))?;
  Ok(())
}

async fn upload_chunk(
  state: &mut Box<UploadState>,
  chunk: &[u8],
) -> Result<(), String> {
  let put_request_data_chunk = PutRequest {
    data: Some(Data::DataChunk(chunk.to_vec())),
  };
  state
    .sender
    .send(put_request_data_chunk)
    .await
    .map_err(|e| format!("Failed to send request. Details {}", e))?;
  Ok(())
}

async fn complete_upload(state: Box<UploadState>) -> Result<bool, String> {
  // We call drop on sender to close corresponding receiver
  // and hence entire gRPC stream. Without this receiver_task
  // would run infinitely
  std::mem::drop(state.sender);
  let result = state
    .receiver_task
    .await
    .map_err(|e| format!("Error occurred on consumer task. Details {}", e))??;
  Ok(result)
}
