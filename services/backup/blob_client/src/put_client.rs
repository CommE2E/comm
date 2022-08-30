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
  if let Ok(client) = CLIENT.lock() {
    if client.tx.is_none()
      || client.rx.is_none()
      || client.rx_handle.is_none()
    {
      return false;
    }
  } else {
    return false;
  }
  return true;
}

fn report_error(message: String) {
  println!("[RUST] Error: {}", message);
  if let Ok(mut error_messages) = ERROR_MESSAGES.lock() {
    error_messages.push(message);
  }
  error!("could not access error messages");
}

fn check_error() -> Result<(), String> {
  if let Ok(errors) = ERROR_MESSAGES.lock() {
    return match errors.is_empty() {
      true => Ok(()),
      false => Err(errors.join("\n")),
    }
  }
  Err("could not access error messages".to_string())
}

pub fn put_client_initialize_cxx() -> Result<(), String> {
  println!("[RUST] initializing");
  assert!(!is_initialized(), "client cannot be initialized twice");
  // grpc
  let mut maybe_grpc_client: Option<
    BlobServiceClient<tonic::transport::Channel>,
  > = None;
  RUNTIME.block_on(async {
    maybe_grpc_client = BlobServiceClient::connect(BLOB_ADDRESS).await.ok();
  });
  if maybe_grpc_client.is_none() {
    return Err("could not successfully connect to the blob server".to_string());
  }
  let mut grpc_client = maybe_grpc_client.unwrap();

  let (request_thread_tx, mut request_thread_rx): (
    mpsc::Sender<PutRequestData>,
    mpsc::Receiver<PutRequestData>,
  ) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);

    let outbound = async_stream::stream! {
      while let Some(data) = request_thread_rx.recv().await {
        println!("[RUST] [transmitter_thread] field index: {}", data.field_index);
        println!("[RUST] [transmitter_thread] data size: {}", data.data.len());
        let request_data: Option<put_request::Data> = match data.field_index {
          0 => {
            match String::from_utf8(data.data).ok() {
              Some(utf8_data) => Some(Holder(utf8_data)),
              None => {
                report_error("invalid utf-8".to_string());
                None
              },
            }
          }
          1 => {
            match String::from_utf8(data.data).ok() {
              Some(utf8_data) => Some(BlobHash(utf8_data)),
              None => {
                report_error("invalid utf-8".to_string());
                None
              },
            }
          }
          2 => {
            Some(DataChunk(data.data))
          }
          _ => {
            report_error(format!("invalid field index value {}", data.field_index));
            None
          }
        };
        if let Some (unpacked_data) = request_data {
          let request = PutRequest {
            data: Some(unpacked_data),
          };
          yield request;
        } else {
          report_error("an error occured, aborting connection".to_string());
          break;
        }
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
      > = match grpc_client.put(tonic::Request::new(outbound)).await {
        Ok(res) => Some(res),
        Err(err) => {
          report_error(err.to_string());
          None
        }
      };
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
        None => {
          report_error(format!("unexpected result received"));
          return;
        }
      };
      println!("[RUST] [receiver_thread] done");
    });

    if let Ok(mut client) = CLIENT.lock() {
      client.tx = Some(request_thread_tx);
      client.rx_handle = Some(rx_handle);
      client.rx = Some(response_thread_rx);
      println!("[RUST] initialized");
      return Ok(());
    }
    return Err("could not access client".to_string());
  
}

pub fn put_client_blocking_read_cxx() -> Result<String, String> {
  let mut response: Option<String> = None;
  check_error()?;
  RUNTIME.block_on(async {
    if let Ok(mut client) = CLIENT.lock() {
      if let Some(mut rx) = client.rx.take() {
        if let Some(data) = rx.recv().await {
          println!("received data {}", data);
          response = Some(data);
        } else {
          report_error(
            "couldn't receive data via client's receiver".to_string(),
          );
        }
        client.rx = Some(rx);
      } else {
        report_error("couldn't access client's receiver".to_string());
      }
    } else {
      report_error("couldn't access client".to_string());
    }
  });
  check_error()?;
  response.ok_or("response not received properly".to_string())
}

/**
 * field index:
 * 0 - holder (utf8 string)
 * 1 - blob hash (utf8 string)
 * 2 - data chunk (bytes)
 */
pub fn put_client_write_cxx(
  field_index: usize,
  data: *const c_char,
) -> Result<(), String> {
  println!("[RUST] [put_client_process] begin");
  check_error()?;
  let data_c_str: &CStr = unsafe { CStr::from_ptr(data) };
  let data_bytes: Vec<u8> = data_c_str.to_bytes().to_vec();
  println!("[RUST] [put_client_process] field index: {}", field_index);
  println!("[RUST] [put_client_process] data string size: {}", data_bytes.len());

  RUNTIME.block_on(async {
    if let Ok(mut client) = CLIENT.lock() {
      if let Some(tx) = client.tx.take() {
        match tx
          .send(PutRequestData {
            field_index,
            data: data_bytes,
          })
          .await
        {
          Ok(_) => (),
          Err(err) => report_error(format!("send data to receiver failed: {}", err)), // channel closed here
        }
        client.tx = Some(tx);
      } else {
        report_error("couldn't access client's transmitter".to_string());
      }
    } else {
      report_error("couldn't access client".to_string());
    }
  });
  println!("[RUST] [put_client_process] end");
  Ok(())
}

// returns vector of error messages
// empty vector indicates that there were no errors
pub fn put_client_terminate_cxx() -> Result<(), String> {
  check_error()?;
  if !is_initialized() {
    return Ok(());
  }
  println!("[RUST] put_client_terminate_cxx begin");
  check_error()?;

  if let Ok(mut client) = CLIENT.lock() {
    if let Some(tx) = client.tx.take() {
      drop(tx);
    }
    if let Some(rx_handle) = client.rx_handle.take() {
      RUNTIME.block_on(async {
        if rx_handle.await.is_err() {
          report_error("wait for receiver handle failed".to_string());
        }
      });
    }
  } else {
    report_error("couldn't access client".to_string());
  }

  assert!(
    !is_initialized(),
    "client transmitter handler released properly"
  );
  check_error()?;
  println!("[RUST] put_client_terminated");
  check_error()?;
  Ok(())
}
