mod proto {
  tonic::include_proto!("blob");
}

use proto::blob_service_client::BlobServiceClient;
use proto::GetRequest;

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
    report_error("couldn't access client".to_string());
  }
  false
}

fn report_error(message: String) {
  println!("[RUST] [get] Error: {}", message);
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
    };
  }
  Err("could not access error messages".to_string())
}

pub fn get_client_initialize_cxx(
  holder_char: *const c_char,
) -> Result<(), String> {
  let initialized = is_initialized();
  if initialized {
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
    let (response_thread_tx, response_thread_rx): (
      mpsc::Sender<Vec<u8>>,
      mpsc::Receiver<Vec<u8>>,
    ) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let rx_handle = RUNTIME.spawn(async move {
      if let Ok(response) = grpc_client.get(GetRequest { holder }).await {
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
                    report_error(err.to_string());
                    false
                  }
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
      } else {
        report_error("couldn't perform grpc get operation".to_string());
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
  let mut response: Option<Vec<u8>> = None;
  check_error()?;
  RUNTIME.block_on(async {
    if let Ok(mut maybe_client) = CLIENT.lock() {
      if let Some(mut client) = (*maybe_client).take() {
        if let Some(data) = client.rx.recv().await {
          response = Some(data);
        } else {
          response = Some(vec![]);
        }
        *maybe_client = Some(client);
      } else {
        report_error("no client present".to_string());
      }
    } else {
      report_error("couldn't access client".to_string());
    }
  });
  check_error()?;
  let response: Vec<u8> = response.unwrap();
  Ok(response)
}

pub fn get_client_terminate_cxx() -> Result<(), String> {
  unimplemented!();
}
