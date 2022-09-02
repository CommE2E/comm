use blob::blob_service_client::BlobServiceClient;
use blob::{put_request::Data, GetRequest, GetResponse, PutRequest};
use lazy_static::lazy_static;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc;
use tokio::task;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tonic::{Request, Streaming};

pub mod blob {
  tonic::include_proto!("blob");
}

const BLOB_SERVICE_SOCKET_ADDR: &str = "http://localhost:50053";

lazy_static! {
  pub static ref RUNTIME: Runtime = Builder::new_multi_thread()
    .worker_threads(1)
    .max_blocking_threads(1)
    .enable_all()
    .build()
    .unwrap();
}

#[cxx::bridge(namespace = "blob")]
mod ffi {
  extern "Rust" {
    type UploadState;
    type DownloadState;

    fn initialize_upload_state_blocking() -> Result<Box<UploadState>>;
    fn start_upload_blocking(
      state: &mut Box<UploadState>,
      holder: String,
      hash: String,
    ) -> Result<()>;
    fn upload_chunk_blocking(
      state: &mut Box<UploadState>,
      chunk: &String,
    ) -> Result<()>;
    fn complete_upload_blocking(client: Box<UploadState>) -> Result<bool>;
    fn initialize_download_state_blocking(
      holder: String,
    ) -> Result<Box<DownloadState>>;
    fn pull_chunk_blocking(
      client: &mut Box<DownloadState>,
      buffer: &mut Vec<String>,
    ) -> Result<bool>;
  }
}

pub struct UploadState {
  sender: mpsc::UnboundedSender<PutRequest>,
  receiver_task: task::JoinHandle<Result<bool, String>>,
}

pub struct DownloadState {
  response_stream: Streaming<GetResponse>,
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
    .map_err(|e| format!("Failed to send request. Details {}", e))?;
  state
    .sender
    .send(hash_request)
    .map_err(|e| format!("Failed to send request. Details {}", e))?;
  Ok(())
}

async fn upload_chunk(
  state: &mut Box<UploadState>,
  chunk: &String,
) -> Result<(), String> {
  let put_request_data_chunk = PutRequest {
    data: Some(Data::DataChunk(chunk.as_bytes().to_vec())),
  };
  state
    .sender
    .send(put_request_data_chunk)
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

async fn initialize_download_state(
  holder: String,
) -> Result<Box<DownloadState>, String> {
  let mut client =
    BlobServiceClient::connect(BLOB_SERVICE_SOCKET_ADDR)
      .await
      .map_err(|e| format!("Can't connect to blob service. Details {}", e))?;

  let request = GetRequest { holder: holder };
  let response_stream = client
    .get(Request::new(request))
    .await
    .map_err(|e| format!("Can't initialize gRPC streaming. Details {}", e))?
    .into_inner();

  Ok(Box::new(DownloadState {
    response_stream: response_stream,
  }))
}

async fn pull_chunk(
  client: &mut Box<DownloadState>,
  buffer: &mut Vec<String>,
) -> Result<bool, String> {
  // Getting None from response_stream indicates that server closed
  // stream, so we return false to inform C++ caller about this fact
  if let Some(response) =
    client.response_stream.message().await.map_err(|e| {
      format!("Failed to pull response from stream. Details {}", e)
    })?
  {
    let chunk = String::from_utf8(response.data_chunk)
      .map_err(|e| format!("Invalid bytes received. Details {}", e))?;
    buffer.push(chunk);
    return Ok(true);
  }
  Ok(false)
}

pub fn initialize_upload_state_blocking() -> Result<Box<UploadState>, String> {
  RUNTIME.block_on(initialize_upload_state())
}

pub fn start_upload_blocking(
  state: &mut Box<UploadState>,
  holder: String,
  hash: String,
) -> Result<(), String> {
  RUNTIME.block_on(start_upload(state, holder, hash))
}

pub fn upload_chunk_blocking(
  state: &mut Box<UploadState>,
  chunk: &String,
) -> Result<(), String> {
  RUNTIME.block_on(upload_chunk(state, chunk))
}

pub fn complete_upload_blocking(
  client: Box<UploadState>,
) -> Result<bool, String> {
  RUNTIME.block_on(complete_upload(client))
}

pub fn initialize_download_state_blocking(
  holder: String,
) -> Result<Box<DownloadState>, String> {
  RUNTIME.block_on(initialize_download_state(holder))
}

pub fn pull_chunk_blocking(
  client: &mut Box<DownloadState>,
  buffer: &mut Vec<String>,
) -> Result<bool, String> {
  RUNTIME.block_on(pull_chunk(client, buffer))
}
