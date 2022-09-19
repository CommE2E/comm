mod proto {
  tonic::include_proto!("blob");
}

use proto::blob_service_client::BlobServiceClient;
use proto::GetRequest;

use crate::constants::{BLOB_ADDRESS, MPSC_CHANNEL_BUFFER_CAPACITY};
use crate::tools::{
  c_char_pointer_to_string, string_to_c_char_pointer,
};
use anyhow::bail;
use crate::RUNTIME;
use lazy_static::lazy_static;
use libc;
use libc::c_char;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;

struct ReadClient {
  rx: mpsc::Receiver<Vec<u8>>,
  rx_handle: JoinHandle<anyhow::Result<(), anyhow::Error>>,
}

lazy_static! {
  // todo: we should consider limiting the clients size,
  // if every client is able to allocate up to 4MB data at a time
  static ref CLIENTS: Mutex<HashMap<String, ReadClient>> =
    Mutex::new(HashMap::new());
  static ref ERROR_MESSAGES: Mutex<Vec<String>> =
    Mutex::new(Vec::new());
}

fn is_initialized(holder: &str) -> anyhow::Result<bool, anyhow::Error> {
  if let Ok(clients) = CLIENTS.lock() {
    return Ok(clients.contains_key(holder));
  }
  bail!("couldn't access client");
}

pub fn get_client_initialize_cxx(
  holder_char: *const c_char,
) -> anyhow::Result<(), anyhow::Error> {
  let holder = c_char_pointer_to_string(holder_char)?;
  if is_initialized(&holder)? {
    get_client_terminate_cxx(string_to_c_char_pointer(&holder)?)?;
  }

  // grpc
  if let Ok(mut grpc_client) =
    RUNTIME.block_on(async { BlobServiceClient::connect(BLOB_ADDRESS).await })
  {
    // spawn receiver thread
    let (response_thread_tx, response_thread_rx) =
      mpsc::channel::<Vec<u8>>(MPSC_CHANNEL_BUFFER_CAPACITY);
    let cloned_holder = holder.clone();
    let rx_handle = RUNTIME.spawn(async move {
      let response = grpc_client
        .get(GetRequest {
          holder: cloned_holder,
        })
        .await?;
      let mut inner_response = response.into_inner();
      loop {
        let maybe_data = inner_response.message().await?;
        let mut result = false;
        if let Some(data) = maybe_data {
          let data: Vec<u8> = data.data_chunk;
          result = match response_thread_tx.send(data).await {
            Ok(_) => true,
            Err(err) => {
              bail!(err);
            }
          }
        }
        if !result {
          break;
        }
      }
      Ok(())
    });

    if let Ok(mut clients) = CLIENTS.lock() {
      let client = ReadClient {
        rx_handle,
        rx: response_thread_rx,
      };
      (*clients).insert(holder, client);
      return Ok(());
    }
    bail!("could not access client");
  }
  bail!("could not successfully connect to the blob server")
}

pub fn get_client_blocking_read_cxx(
  holder_char: *const c_char,
) -> anyhow::Result<Vec<u8>, anyhow::Error> {
  let holder = c_char_pointer_to_string(holder_char)?;
  Ok(RUNTIME.block_on(async {
    if let Ok(mut clients) = CLIENTS.lock() {
      if let Some(client) = clients.get_mut(&holder) {
        let maybe_data = client.rx.recv().await;
        return Ok(maybe_data.unwrap_or_else(|| vec![]));
      } else {
        bail!(format!("no client present for {}", holder));
      }
    } else {
      bail!("couldn't access client");
    }
  })?)
}

pub fn get_client_terminate_cxx(
  holder_char: *const c_char,
) -> anyhow::Result<(), anyhow::Error> {
  let holder = c_char_pointer_to_string(holder_char)?;
  if !is_initialized(&holder)? {
    return Ok(());
  }
  if let Ok(mut clients) = CLIENTS.lock() {
    match clients.remove(&holder) {
      Some(client) => {
        RUNTIME.block_on(async {
          if client.rx_handle.await.is_err() {
            bail!(format!("awaiting for the client {} failed", holder));
          }
          Ok(())
        })?;
      }
      None => {
        bail!(format!("no client foudn for {}", holder));
      }
    }
  } else {
    bail!("couldn't access client");
  }

  if is_initialized(&holder)? {
    bail!("client transmitter handler released properly");
  }
  Ok(())
}
