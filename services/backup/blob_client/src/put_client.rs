mod proto {
  tonic::include_proto!("blob");
}

use proto::blob_service_client::BlobServiceClient;
use proto::put_request;
use proto::put_request::Data::*;
use proto::PutRequest;
use proto::PutResponse;

use crate::constants::{BLOB_ADDRESS, MPSC_CHANNEL_BUFFER_CAPACITY};
use lazy_static::lazy_static;
use libc;
use libc::c_char;
use std::ffi::CStr;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tracing::error;

#[derive(Debug)]
struct PutRequestData {
  field_index: usize,
  data: Vec<u8>,
}

struct BidiClient {
  tx: Option<mpsc::Sender<PutRequestData>>,

  rx: Option<mpsc::Receiver<String>>,
  rx_handle: Option<JoinHandle<()>>,
}

lazy_static! {
  static ref CLIENT: Arc<Mutex<BidiClient>> =
    Arc::new(Mutex::new(BidiClient {
      tx: None,
      rx: None,
      rx_handle: None,
    }));
  static ref RUNTIME: Runtime = Runtime::new().unwrap();
  static ref ERROR_MESSAGES: Arc<Mutex<Vec<String>>> =
    Arc::new(Mutex::new(Vec::new()));
}

fn is_initialized() -> bool {
  if CLIENT.lock().expect("access client").tx.is_none() {
    return false;
  }
  if CLIENT.lock().expect("access client").rx.is_none() {
    return false;
  }
  if CLIENT
    .lock()
    .expect("access client")
    .rx_handle
    .is_none()
  {
    return false;
  }
  return true;
}

fn report_error(message: String) {
  error!("[RUST] Error: {}", message);
  ERROR_MESSAGES
    .lock()
    .expect("access error messages")
    .push(message);
}

fn check_error() -> Result<(), String> {
  let errors = ERROR_MESSAGES.lock().expect("access error messages");
  match errors.is_empty() {
    true => Ok(()),
    false => Err(errors.join("\n"),
  }
}

pub fn put_client_initialize_cxx() -> Result<(), String> {
  println!("[RUST] initializing");
  assert!(!is_initialized(), "client cannot be initialized twice");
  // grpc
  let mut grpc_client: Option<BlobServiceClient<tonic::transport::Channel>> =
    None;
  RUNTIME.block_on(async {
    grpc_client = Some(
      BlobServiceClient::connect(BLOB_ADDRESS)
        .await
        .expect("successfully connect to the blob server"),
    );
  });

  let (request_thread_tx, mut request_thread_rx): (
    mpsc::Sender<PutRequestData>,
    mpsc::Receiver<PutRequestData>,
  ) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);

  let outbound = async_stream::stream! {
    while let Some(data) = request_thread_rx.recv().await {
      println!("[RUST] [transmitter_thread] field index: {}", data.field_index);
      println!("[RUST] [transmitter_thread] data: {:?}", data.data);
      let request_data: put_request::Data = match data.field_index {
        0 => Holder(String::from_utf8(data.data).expect("Found invalid UTF-8")),
        1 => BlobHash(String::from_utf8(data.data).expect("Found invalid UTF-8")),
        2 => DataChunk(data.data),
        _ => panic!("invalid field index value {}", data.field_index)
      };
      let request = PutRequest {
        data: Some(request_data),
      };
      yield request;
    }
  };

  // spawn receiver thread
  let (response_thread_tx, response_thread_rx): (
    mpsc::Sender<String>,
    mpsc::Receiver<String>,
  ) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
  let rx_handle = RUNTIME.spawn(async move {
    println!("[RUST] [receiver_thread] begin");
    let maybe_response: Option<
      tonic::Response<tonic::codec::Streaming<PutResponse>>,
    > = match grpc_client
      .expect("access grpc client")
      .put(tonic::Request::new(outbound))
      .await
    {
      Ok(res) => Some(res),
      Err(err) => {
        report_error(err.to_string());
        None
      }
    };
    if maybe_response.is_none() {
      return;
    }
    match maybe_response {
      Some(response) => {
        let mut inner_response = response.into_inner();
        let mut response_present = true;
        while response_present {
          response_present = match inner_response.message().await {
            Ok(maybe_response_message) => {
              let mut result = false;
              if let Some(response_message) = maybe_response_message {
                println!(
                  "[RUST] got response: {}",
                  response_message.data_exists
                );
                // warning: this will hang if there's more unread responses than
                // MPSC_CHANNEL_BUFFER_CAPACITY
                // you should then use put_client_blocking_read_cxx in order to dequeue
                // the responses in c++ and make room for more
                if let Ok(_) = response_thread_tx
                  .send((response_message.data_exists as i32).to_string())
                  .await
                {
                  result = true;
                }
              }
              result
            }
            Err(err) => {
              report_error(err.to_string());
              false
            }
          };
        }
      }
      unexpected => {
        report_error(format!("unexpected result received: {:?}", unexpected));
      }
    };
    println!("[RUST] [receiver_thread] done");
  });

  CLIENT.lock().expect("access client").tx = Some(request_thread_tx);
  CLIENT.lock().expect("access client").rx_handle = Some(rx_handle);
  CLIENT.lock().expect("access client").rx = Some(response_thread_rx);
  println!("[RUST] initialized");
  Ok(())
}

pub fn put_client_blocking_read_cxx() -> Result<String, String> {
  let mut response: Option<String> = None;
  check_error()?;
  RUNTIME.block_on(async {
    let mut rx: mpsc::Receiver<String> = CLIENT
      .lock()
      .expect("access client")
      .rx
      .take()
      .expect("access client's receiver");
    if let Some(data) = rx.recv().await {
      println!("received data {}", data);
      response = Some(data);
    }
    CLIENT.lock().expect("access client").rx = Some(rx);
  });
  response.ok_or("response not received properly".to_string())
}

pub fn put_client_write_cxx(
  field_index: usize,
  data: *const c_char,
) -> Result<(), String> {
  println!("[RUST] [put_client_process] begin");
  check_error()?;
  let data_c_str: &CStr = unsafe { CStr::from_ptr(data) };
  let data_bytes: Vec<u8> = data_c_str.to_bytes().to_vec();
  println!("[RUST] [put_client_process] field index: {}", field_index);
  println!("[RUST] [put_client_process] data string: {:?}", data_bytes);

  RUNTIME.block_on(async {
    CLIENT
      .lock()
      .expect("access client")
      .tx
      .as_ref()
      .expect("access client's transmitter")
      .send(PutRequestData {
        field_index,
        data: data_bytes,
      })
      .await
      .expect("send data to receiver");
  });
  println!("[RUST] [put_client_process] end");
  Ok(())
}

// returns vector of error messages
// empty vector indicates that there were no errors
pub fn put_client_terminate_cxx() -> Result<(), String> {
  check_error()?;
  println!("[RUST] put_client_terminating");
  check_error()?;
  if let Some(rx_handle) =
    CLIENT.lock().expect("access client").rx_handle.take()
  {
    if let Some(tx) = CLIENT.lock().expect("access client").tx.take() {
      drop(tx);
    }
    RUNTIME.block_on(async {
      if rx_handle.await.is_err() {
        report_error("wait for receiver handle failed".to_string());
      }
    });
  }

  assert!(
    !is_initialized(),
    "client transmitter handler released properly"
  );
  println!("[RUST] put_client_terminated");
  check_error()?;
  Ok(())
}
