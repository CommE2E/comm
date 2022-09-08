mod proto {
  tonic::include_proto!("blob");
}

use proto::blob_service_client::BlobServiceClient;
use proto::GetRequest;

use crate::constants::{BLOB_ADDRESS, MPSC_CHANNEL_BUFFER_CAPACITY};
use crate::tools::{check_error, report_error};
use lazy_static::lazy_static;
use libc;
use libc::c_char;
use std::ffi::CStr;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;

struct ReadClient {
  rx: mpsc::Receiver<Vec<u8>>,
  rx_handle: JoinHandle<()>,
}

lazy_static! {
  static ref CLIENT: Arc<Mutex<Option<ReadClient>>> =
    Arc::new(Mutex::new(None));
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
    report_error(&ERROR_MESSAGES, "couldn't access client", Some("get"));
  }
  false
}

pub fn get_client_initialize_cxx(
  holder_char: *const c_char,
) -> Result<(), String> {
  if is_initialized() {
    get_client_terminate_cxx()?;
  }

  assert!(!is_initialized(), "client cannot be initialized twice");

  let holder_cstr: &CStr = unsafe { CStr::from_ptr(holder_char) };
  let holder: String = holder_cstr.to_str().unwrap().to_owned();

  // grpc
  if let Ok(mut grpc_client) =
    RUNTIME.block_on(async { BlobServiceClient::connect(BLOB_ADDRESS).await })
  {
    // spawn receiver thread
    let (response_thread_tx, response_thread_rx) =
      mpsc::channel::<Vec<u8>>(MPSC_CHANNEL_BUFFER_CAPACITY);
    let rx_handle = RUNTIME.spawn(async move {
      if let Ok(response) = grpc_client.get(GetRequest { holder }).await {
        let mut inner_response = response.into_inner();
        loop {
          match inner_response.message().await {
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
              if !result {
                break;
              }
            }
            Err(err) => {
              report_error(&ERROR_MESSAGES, &err.to_string(), Some("get"));
              break;
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

    if let Ok(mut client) = CLIENT.lock() {
      *client = Some(ReadClient {
        rx_handle,
        rx: response_thread_rx,
      });
      return Ok(());
    }
    return Err("could not access client".to_string());
  }
  Err("could not successfully connect to the blob server".to_string())
}

pub fn get_client_blocking_read_cxx() -> Result<Vec<u8>, String> {
  check_error(&ERROR_MESSAGES)?;
  let response: Option<Vec<u8>> = RUNTIME.block_on(async {
    if let Ok(mut maybe_client) = CLIENT.lock() {
      if let Some(mut client) = (*maybe_client).take() {
        let maybe_data = client.rx.recv().await;
        let response = Some(maybe_data.unwrap_or_else(|| vec![]));
        *maybe_client = Some(client);
        return response;
      } else {
        report_error(&ERROR_MESSAGES, "no client present", Some("get"));
      }
    } else {
      report_error(&ERROR_MESSAGES, "couldn't access client", Some("get"));
    }
    None
  });
  check_error(&ERROR_MESSAGES)?;
  response.ok_or("response could not be obtained".to_string())
}

pub fn get_client_terminate_cxx() -> Result<(), String> {
  check_error(&ERROR_MESSAGES)?;
  if !is_initialized() {
    check_error(&ERROR_MESSAGES)?;
    return Ok(());
  }
  if let Ok(mut maybe_client) = CLIENT.lock() {
    if let Some(client) = (*maybe_client).take() {
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
    !is_initialized(),
    "client transmitter handler released properly"
  );
  check_error(&ERROR_MESSAGES)?;
  Ok(())
}
