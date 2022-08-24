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
use libc;
use libc::c_char;
use std::ffi::CStr;

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
      println!("[RUST] [transmitter_thread] data: {}", data.data);
      let request_data: put_request::Data = match data.field_index {
        0 => Holder(data.data),
        1 => BlobHash(data.data),
        2 => DataChunk(data.data.into_bytes()),
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
    let response: Option<
      tonic::Response<tonic::codec::Streaming<PutResponse>>,
    > = match grpc_client
      .expect("access grpc client")
      .put(tonic::Request::new(outbound))
      .await
    {
      Ok(res) => Some(res),
      Err(err) => {
        report_error(err.to_string());
        println!("ERROR!! {}", err.to_string());
        None
      }
    };
    if response.is_none() {
      return;
    }
    let mut inbound = response.unwrap().into_inner();
    loop {
      let response: Option<PutResponse> = match inbound.message().await {
        Ok(res) => res,
        Err(err) => {
          report_error(err.to_string());
          println!("ERROR!! {}", err.to_string());
          None
        }
      };
      if response.is_none() {
        break;
      }
      let response: PutResponse = response.unwrap();
      println!("[RUST] got response: {}", response.data_exists);
      // warning: this will hang if there's more unread responses than MPSC_CHANNEL_BUFFER_CAPACITY
      // you should then use put_client_blocking_read_cxx in order to dequeue the responses in c++ and make room for more
      response_thread_tx
        .send((response.data_exists as i32).to_string())
        .await
        .unwrap();
    }
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
  if response.is_none() {
    return Err("response not received properly".to_string());
  }
  Ok(response.unwrap())
}

pub fn put_client_write_cxx(
  field_index: usize,
  data: *const c_char,
) -> Result<(), String> {
  println!("[RUST] [put_client_process] begin");
  check_error()?;
  let data_c_str: &CStr = unsafe { CStr::from_ptr(data) };
  let data_str: String = data_c_str.to_str().unwrap().to_owned();
  println!("[RUST] [put_client_process] field index: {}", field_index);
  println!("[RUST] [put_client_process] data string: {}", data_str);

  RUNTIME.block_on(async {
    CLIENT
      .lock()
      .expect("access client")
      .tx
      .as_ref()
      .expect("access client's transmitter")
      .send(PutRequestData{field_index, data: data_str})
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
  let rx_handle = CLIENT
    .lock()
    .expect("access client")
    .rx_handle
    .take()
    .unwrap();
  drop(CLIENT.lock().expect("access client").tx.take().unwrap());
  RUNTIME.block_on(async {
    rx_handle.await.unwrap();
  });

  assert!(
    !is_initialized(),
    "client transmitter handler released properly"
  );
  println!("[RUST] put_client_terminated");
  check_error()?;
  Ok(())
}
