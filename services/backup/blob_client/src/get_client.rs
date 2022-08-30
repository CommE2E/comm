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
  rx: Option<mpsc::Receiver<Vec<u8>>>,
  rx_handle: Option<JoinHandle<()>>,
}

lazy_static! {
  static ref CLIENT: Arc<Mutex<ReadClient>> =
    Arc::new(Mutex::new(ReadClient {
      rx: None,
      rx_handle: None,
    }));
  static ref RUNTIME: Runtime = Runtime::new().unwrap();
  static ref ERROR_MESSAGES: Arc<Mutex<Vec<String>>> =
    Arc::new(Mutex::new(Vec::new()));
}

fn is_initialized() -> bool {
  if let Ok(client) = CLIENT.lock() {
    if client.rx.is_none() || client.rx_handle.is_none() {
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
    };
  }
  Err("could not access error messages".to_string())
}

pub fn get_client_initialize_cxx(
  holder_char: *const c_char,
) -> Result<(), String> {
  println!("[RUST] initializing");
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
      println!("[RUST] [receiver_thread] begin: {}", holder);

      if let Ok(response) = grpc_client.get(GetRequest { holder }).await {
        let mut inner_response = response.into_inner();
        while let Ok(maybe_data) = inner_response.message().await {
          if let Some(data) = maybe_data {
            let data: Vec<u8> = data.data_chunk;
            println!("data received, size = {}", data.len());
            if let Ok(_) = response_thread_tx.send(data).await {
            } else {
              report_error("failed to pass the response".to_string());
            }
          }
        }
      } else {
        report_error("couldn't perform grpc get operation".to_string());
      }

      println!("[RUST] [receiver_thread] done");
    });

    if let Ok(mut client) = CLIENT.lock() {
      client.rx_handle = Some(rx_handle);
      client.rx = Some(response_thread_rx);
      println!("[RUST] initialized");
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
    if let Ok(mut client) = CLIENT.lock() {
      if let Some(mut rx) = client.rx.take() {
        if let Some(data) = rx.recv().await {
          println!("received data of size {}", data.len());
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

pub fn get_client_terminate_cxx() -> Result<(), String> {
  check_error()?;
  if !is_initialized() {
    return Ok(());
  }
  println!("[RUST] get_client_terminate_cxx begin");

  if let Ok(mut client) = CLIENT.lock() {
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
  println!("[RUST] get_client_terminate_cxx end");
  check_error()?;
  Ok(())
}
