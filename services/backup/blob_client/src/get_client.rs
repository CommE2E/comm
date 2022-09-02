mod proto {
  tonic::include_proto!("blob");
}

use proto::blob_service_client::BlobServiceClient;
use proto::GetRequest;

use crate::constants::{BLOB_ADDRESS, MPSC_CHANNEL_BUFFER_CAPACITY};
use crate::tools::{check_error, report_error, c_char_pointer_to_string, string_to_c_char_pointer};
use lazy_static::lazy_static;
use libc;
use libc::c_char;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use std::collections::HashMap;

struct ReadClient {
  rx: mpsc::Receiver<Vec<u8>>,
  rx_handle: JoinHandle<()>,
}

lazy_static! {
  // todo: we should consider limiting the clients size,
  // if every client is able to allocate up to 4MB data at a time
  static ref CLIENTS: Arc<Mutex<HashMap<String, ReadClient>>> =
    Arc::new(Mutex::new(HashMap::new()));
  static ref RUNTIME: Runtime = Runtime::new().unwrap();
  static ref ERROR_MESSAGES: Arc<Mutex<Vec<String>>> =
    Arc::new(Mutex::new(Vec::new()));
}

fn is_initialized(holder: &String) -> bool {
  if let Ok(clients) = CLIENTS.lock() {
    return clients.contains_key(holder);
  } else {
    report_error(&ERROR_MESSAGES, "couldn't access client", Some("put"));
  }
  false
}

pub fn get_client_initialize_cxx(
  holder_char: *const c_char,
) -> Result<(), String> {
  let holder = c_char_pointer_to_string(holder_char);
  if is_initialized(&holder) {
    get_client_terminate_cxx(string_to_c_char_pointer(&holder))?;
  }

  assert!(!is_initialized(&holder), "client cannot be initialized twice");

  // grpc
  if let Ok(mut grpc_client) =
    RUNTIME.block_on(async { BlobServiceClient::connect(BLOB_ADDRESS).await })
  {
    // spawn receiver thread
    let (response_thread_tx, response_thread_rx): (
      mpsc::Sender<Vec<u8>>,
      mpsc::Receiver<Vec<u8>>,
    ) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let cloned_holder = holder.clone();
    let rx_handle = RUNTIME.spawn(async move {
      if let Ok(response) = grpc_client.get(GetRequest { holder: cloned_holder }).await {
        let mut inner_response = response.into_inner();
        let mut response_present = true;
        while response_present {
          response_present = match inner_response.message().await {
            Ok(maybe_data) => {
              let mut result = false;
              if let Some(data) = maybe_data {
                let data: Vec<u8> = data.data_chunk;
                result = match response_thread_tx.send(data).await {
                  Ok(_) => true,
                  Err(err) => {
                    report_error(
                      &ERROR_MESSAGES,
                      &err.to_string(),
                      Some("get"),
                    );
                    false
                  }
                }
              }
              result
            }
            Err(err) => {
              report_error(&ERROR_MESSAGES, &err.to_string(), Some("get"));
              false
            }
          };
        }
      } else {
        report_error(
          &ERROR_MESSAGES,
          "couldn't perform grpc get operation",
          Some("get"),
        );
      }
    });

    if let Ok(mut clients) = CLIENTS.lock() {
      let client = ReadClient {
        rx_handle,
        rx: response_thread_rx,
      };
      (*clients).insert(holder, client);
      return Ok(());
    }
    return Err("could not access client".to_string());
  }
  Err("could not successfully connect to the blob server".to_string())
}

pub fn get_client_blocking_read_cxx(holder_char: *const c_char) -> Result<Vec<u8>, String> {
  let holder = c_char_pointer_to_string(holder_char);
  let mut response: Option<Vec<u8>> = None;
  check_error(&ERROR_MESSAGES)?;
  RUNTIME.block_on(async {
    if let Ok(mut clients) = CLIENTS.lock() {
      let maybe_client = clients.get_mut(&holder);
      if let Some(client) = maybe_client {
        if let Some(data) = client.rx.recv().await {
          response = Some(data);
        } else {
          response = Some(vec![]);
        }
      } else {
        report_error(&ERROR_MESSAGES, "no client present", Some("get"));
      }
    } else {
      report_error(&ERROR_MESSAGES, "couldn't access client", Some("get"));
    }
  });
  check_error(&ERROR_MESSAGES)?;
  let response: Vec<u8> = response.unwrap();
  Ok(response)
}

pub fn get_client_terminate_cxx(holder_char: *const c_char) -> Result<(), String> {
  let holder = c_char_pointer_to_string(holder_char);
  check_error(&ERROR_MESSAGES)?;
  if !is_initialized(&holder) {
    check_error(&ERROR_MESSAGES)?;
    return Ok(());
  }
  if let Ok(mut clients) = CLIENTS.lock() {
    let maybe_client = clients.remove(&holder);
    if let Some(client) = maybe_client {
      RUNTIME.block_on(async {
        if client.rx_handle.await.is_err() {
          report_error(
            &ERROR_MESSAGES,
            "wait for receiver handle failed",
            Some("get"),
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
    !is_initialized(&holder),
    "client transmitter handler released properly"
  );
  check_error(&ERROR_MESSAGES)?;
  Ok(())
}
