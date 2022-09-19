use blob::blob_service_client::BlobServiceClient;
use blob::PutRequest;
use tokio::sync::mpsc;
use tokio::task;
use tokio_stream::wrappers::ReceiverStream;
use tonic::Request;

pub mod blob {
  tonic::include_proto!("blob");
}

const PUT_REQUEST_BUFFER_SIZE: usize = 1;
const BLOB_SERVICE_SOCKET_ADDR: &str = "http://localhost:50053";

pub struct UploadState {
  sender: mpsc::Sender<PutRequest>,
  receiver_task: task::JoinHandle<Result<bool, String>>,
}

pub async fn initialize_upload_state() -> Result<Box<UploadState>, String> {
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
    sender,
    receiver_task,
  }))
}
