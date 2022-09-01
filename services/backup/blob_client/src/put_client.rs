mod proto {
  tonic::include_proto!("blob");
}

use proto::blob_service_client::BlobServiceClient;
use proto::put_request;
use proto::put_request::Data::*;
use proto::PutRequest;
use proto::PutResponse;

use crate::constants::{BLOB_ADDRESS, MPSC_CHANNEL_BUFFER_CAPACITY};
use crate::tools::{report_error, check_error};
use lazy_static::lazy_static;
use libc;
use libc::c_char;
use std::ffi::CStr;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;

#[derive(Debug)]
struct PutRequestData {
  field_index: usize,
  data: Vec<u8>,
}

struct BidiClient {
  tx: mpsc::Sender<PutRequestData>,

  rx: mpsc::Receiver<String>,
  rx_handle: JoinHandle<()>,
}

lazy_static! {
  static ref CLIENT: Arc<Mutex<Option<BidiClient>>> =
    Arc::new(Mutex::new(None));
  // todo we should probably create separate clients for different IDs
  static ref RUNTIME: Runtime = Runtime::new().unwrap();
  static ref ERROR_MESSAGES: Arc<Mutex<Vec<String>>> =
    Arc::new(Mutex::new(Vec::new()));
}

fn is_initialized() -> bool {
  if let Ok(client) = CLIENT.lock() {
    if client.is_some() {
      return true;
    }
  } else {
    report_error(&ERROR_MESSAGES, "couldn't access client", Some("put"));
  }
  false
}

pub fn put_client_initialize_cxx() -> Result<(), String> {
  if is_initialized() {
    put_client_terminate_cxx()?;
  }
  assert!(!is_initialized(), "client cannot be initialized twice");
  // grpc
  if let Ok(mut grpc_client) =
    RUNTIME.block_on(async { BlobServiceClient::connect(BLOB_ADDRESS).await })
  {
    let (request_thread_tx, mut request_thread_rx): (
      mpsc::Sender<PutRequestData>,
      mpsc::Receiver<PutRequestData>,
    ) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);

    let outbound = async_stream::stream! {
      while let Some(data) = request_thread_rx.recv().await {
        let request_data: Option<put_request::Data> = match data.field_index {
          1 => {
            match String::from_utf8(data.data).ok() {
              Some(utf8_data) => Some(Holder(utf8_data)),
              None => {
                report_error(&ERROR_MESSAGES, "invalid utf-8", Some("put"));
                None
              },
            }
          }
          2 => {
            match String::from_utf8(data.data).ok() {
              Some(utf8_data) => Some(BlobHash(utf8_data)),
              None => {
                report_error(&ERROR_MESSAGES, "invalid utf-8", Some("put"));
                None
              },
            }
          }
          3 => {
            Some(DataChunk(data.data))
          }
          _ => {
            report_error(&ERROR_MESSAGES, &format!("invalid field index value {}", data.field_index), Some("put"));
            None
          }
        };
        if let Some (unpacked_data) = request_data {
          let request = PutRequest {
            data: Some(unpacked_data),
          };
          yield request;
        } else {
          report_error(&ERROR_MESSAGES, "an error occured, aborting connection", Some("put"));
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
      let maybe_response: Option<
        tonic::Response<tonic::codec::Streaming<PutResponse>>,
      > = match grpc_client.put(tonic::Request::new(outbound)).await {
        Ok(res) => Some(res),
        Err(err) => {
          report_error(&ERROR_MESSAGES, &err.to_string(), Some("put"));
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
                  // warning: this will produce an error if there's more unread responses than
                  // MPSC_CHANNEL_BUFFER_CAPACITY
                  // you should then use put_client_blocking_read_cxx in order to dequeue
                  // the responses in c++ and make room for more
                  if let Ok(_) = response_thread_tx
                    .try_send((response_message.data_exists as i32).to_string())
                  {
                    result = true;
                  } else {
                    report_error(
                      &ERROR_MESSAGES,
                      "response queue full",
                      Some("put"),
                    );
                  }
                }
                result
              }
              Err(err) => {
                report_error(&ERROR_MESSAGES, &err.to_string(), Some("put"));
                false
              }
            };
          }
        }
        None => {
          report_error(
            &ERROR_MESSAGES,
            &format!("unexpected result received"),
            Some("put"),
          );
          return;
        }
      };
    });

    if let Ok(mut client) = CLIENT.lock() {
      *client = Some(BidiClient {
        tx: request_thread_tx,
        rx: response_thread_rx,
        rx_handle,
      });
      return Ok(());
    }
    return Err("could not access client".to_string());
  }
  Err("could not successfully connect to the blob server".to_string())
}

pub fn put_client_blocking_read_cxx() -> Result<String, String> {
  let mut response: Option<String> = None;
  check_error(&ERROR_MESSAGES)?;
  RUNTIME.block_on(async {
    if let Ok(mut maybe_client) = CLIENT.lock() {
      if let Some(mut client) = (*maybe_client).take() {
        if let Some(data) = client.rx.recv().await {
          response = Some(data);
        } else {
          report_error(
            &ERROR_MESSAGES,
            "couldn't receive data via client's receiver",
            Some("put"),
          );
        }
        *maybe_client = Some(client);
      } else {
        report_error(&ERROR_MESSAGES, "no client detected", Some("put"));
      }
    } else {
      report_error(&ERROR_MESSAGES, "couldn't access client", Some("put"));
    }
  });
  check_error(&ERROR_MESSAGES)?;
  response.ok_or("response not received properly".to_string())
}

/**
 * field index:
 * 1 - holder (utf8 string)
 * 2 - blob hash (utf8 string)
 * 3 - data chunk (bytes)
 */
pub fn put_client_write_cxx(
  field_index: usize,
  data: *const c_char,
) -> Result<(), String> {
  check_error(&ERROR_MESSAGES)?;
  let data_c_str: &CStr = unsafe { CStr::from_ptr(data) };
  let data_bytes: Vec<u8> = data_c_str.to_bytes().to_vec();

  RUNTIME.block_on(async {
    if let Ok(mut maybe_client) = CLIENT.lock() {
      if let Some(client) = (*maybe_client).take() {
        match client
          .tx
          .send(PutRequestData {
            field_index,
            data: data_bytes,
          })
          .await
        {
          Ok(_) => (),
          Err(err) => report_error(
            &ERROR_MESSAGES,
            &format!("send data to receiver failed: {}", err),
            Some("put"),
          ),
        }
        *maybe_client = Some(client);
      } else {
        report_error(&ERROR_MESSAGES, "no client detected", Some("put"));
      }
    } else {
      report_error(&ERROR_MESSAGES, "couldn't access client", Some("put"));
    }
  });
  Ok(())
}

pub fn put_client_terminate_cxx() -> Result<(), String> {
  check_error(&ERROR_MESSAGES)?;
  if !is_initialized() {
    check_error(&ERROR_MESSAGES)?;
    return Ok(());
  }

  if let Ok(mut maybe_client) = CLIENT.lock() {
    if let Some(client) = (*maybe_client).take() {
      drop(client.tx);
      RUNTIME.block_on(async {
        if client.rx_handle.await.is_err() {
          report_error(
            &ERROR_MESSAGES,
            "wait for receiver handle failed",
            Some("put"),
          );
        }
      });
    } else {
      return Err("no client detected".to_string());
    }
  } else {
    return Err("couldn't access client".to_string());
  }

  assert!(
    !is_initialized(),
    "client transmitter handler released properly"
  );
  check_error(&ERROR_MESSAGES)?;
  Ok(())
}
