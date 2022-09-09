mod proto {
  tonic::include_proto!("blob");
}

use proto::blob_service_client::BlobServiceClient;
use proto::put_request;
use proto::put_request::Data::*;
use proto::PutRequest;

use crate::constants::{BLOB_ADDRESS, MPSC_CHANNEL_BUFFER_CAPACITY};
use crate::tools::{
  c_char_pointer_to_string, check_error, report_error, string_to_c_char_pointer,
};
use lazy_static::lazy_static;
use libc;
use libc::c_char;
use std::collections::HashMap;
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
  // todo: we should consider limiting the clients size,
  // if every client is able to allocate up to 4MB data at a time
  static ref CLIENTS: Arc<Mutex<HashMap<String, BidiClient>>> =
    Arc::new(Mutex::new(HashMap::new()));
  static ref RUNTIME: Runtime = Runtime::new().unwrap();
  static ref ERROR_MESSAGES: Arc<Mutex<Vec<String>>> =
    Arc::new(Mutex::new(Vec::new()));
}

fn is_initialized(holder: &String) -> bool {
  match CLIENTS.lock() {
    Ok(clients) => clients.contains_key(holder),
    _ => {
      report_error(&ERROR_MESSAGES, "couldn't access client", Some("put"));
      false
    }
  }
}

pub fn put_client_initialize_cxx(
  holder_char: *const c_char,
) -> Result<(), String> {
  let holder = c_char_pointer_to_string(holder_char)?;
  if is_initialized(&holder) {
    put_client_terminate_cxx(string_to_c_char_pointer(&holder)?)?;
  }
  assert!(
    !is_initialized(&holder),
    "client cannot be initialized twice"
  );
  // grpc
  if let Ok(mut grpc_client) =
    RUNTIME.block_on(async { BlobServiceClient::connect(BLOB_ADDRESS).await })
  {
    let (request_thread_tx, mut request_thread_rx) =
      mpsc::channel::<PutRequestData>(MPSC_CHANNEL_BUFFER_CAPACITY);

    let outbound = async_stream::stream! {
      while let Some(data) = request_thread_rx.recv().await {
        let request_data: Option<put_request::Data> = match data.field_index {
          1 => {
            match String::from_utf8(data.data) {
              Ok(utf8_data) => Some(Holder(utf8_data)),
              _ => {
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
            report_error(
              &ERROR_MESSAGES,
              &format!("invalid field index value {}", data.field_index),
              Some("put")
            );
            None
          }
        };
        if let Some (unpacked_data) = request_data {
          let request = PutRequest {
            data: Some(unpacked_data),
          };
          yield request;
        } else {
          report_error(
            &ERROR_MESSAGES,
            "an error occured, aborting connection",
            Some("put")
          );
          break;
        }
      }
    };

    // spawn receiver thread
    let (response_thread_tx, response_thread_rx) =
      mpsc::channel::<String>(MPSC_CHANNEL_BUFFER_CAPACITY);
    let rx_handle = RUNTIME.spawn(async move {
      match grpc_client.put(tonic::Request::new(outbound)).await {
        Ok(response) => {
          let mut inner_response = response.into_inner();
          loop {
            match inner_response.message().await {
              Ok(maybe_response_message) => {
                let mut result = false;
                if let Some(response_message) = maybe_response_message {
                  // warning: this will produce an error if there's more unread
                  // responses than MPSC_CHANNEL_BUFFER_CAPACITY
                  // you should then use put_client_blocking_read_cxx in order
                  // to dequeue the responses in c++ and make room for more
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
                if !result {
                  break;
                }
              }
              Err(err) => {
                report_error(&ERROR_MESSAGES, &err.to_string(), Some("put"));
                break;
              }
            };
          }
        }
        Err(err) => {
          report_error(&ERROR_MESSAGES, &err.to_string(), Some("put"));
        }
      };
    });

    if is_initialized(&holder) {
      return Err(format!(
        "client initialization overlapped for holder {}",
        holder
      ));
    }
    if let Ok(mut clients) = CLIENTS.lock() {
      let client = BidiClient {
        tx: request_thread_tx,
        rx: response_thread_rx,
        rx_handle,
      };
      (*clients).insert(holder, client);
      return Ok(());
    }
    return Err(format!("could not access client for holder {}", holder));
  }
  Err("could not successfully connect to the blob server".to_string())
}

pub fn put_client_blocking_read_cxx(
  holder_char: *const c_char,
) -> Result<String, String> {
  let holder = c_char_pointer_to_string(holder_char)?;
  check_error(&ERROR_MESSAGES)?;
  let response: Option<String> = RUNTIME.block_on(async {
    if let Ok(mut clients) = CLIENTS.lock() {
      let maybe_client = clients.get_mut(&holder);
      if let Some(client) = maybe_client {
        if let Some(data) = client.rx.recv().await {
          return Some(data);
        } else {
          report_error(
            &ERROR_MESSAGES,
            "couldn't receive data via client's receiver",
            Some("put"),
          );
        }
      } else {
        report_error(
          &ERROR_MESSAGES,
          "no client detected in blocking read",
          Some("put"),
        );
      }
    } else {
      report_error(&ERROR_MESSAGES, "couldn't access client", Some("put"));
    }
    None
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
  holder_char: *const c_char,
  field_index: usize,
  data: *const c_char,
) -> Result<(), String> {
  let holder = c_char_pointer_to_string(holder_char)?;
  check_error(&ERROR_MESSAGES)?;
  let data_c_str: &CStr = unsafe { CStr::from_ptr(data) };
  let data_bytes: Vec<u8> = data_c_str.to_bytes().to_vec();

  RUNTIME.block_on(async {
    if let Ok(clients) = CLIENTS.lock() {
      let maybe_client = clients.get(&holder);
      if let Some(client) = maybe_client {
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
      } else {
        report_error(
          &ERROR_MESSAGES,
          "no client detected in write",
          Some("put"),
        );
      }
    } else {
      report_error(&ERROR_MESSAGES, "couldn't access client", Some("put"));
    }
  });
  check_error(&ERROR_MESSAGES)?;
  Ok(())
}

pub fn put_client_terminate_cxx(
  holder_char: *const c_char,
) -> Result<(), String> {
  let holder = c_char_pointer_to_string(holder_char)?;
  check_error(&ERROR_MESSAGES)?;
  if !is_initialized(&holder) {
    check_error(&ERROR_MESSAGES)?;
    return Ok(());
  }

  if let Ok(mut clients) = CLIENTS.lock() {
    let maybe_client = clients.remove(&holder);
    if let Some(client) = maybe_client {
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
      return Err("no client detected in terminate".to_string());
    }
  } else {
    return Err("couldn't access client".to_string());
  }

  assert!(
    !is_initialized(&holder),
    "client transmitter handler released properly"
  );
  check_error(&ERROR_MESSAGES)?;
  Ok(())
}
