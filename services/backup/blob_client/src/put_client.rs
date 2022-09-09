mod proto {
  tonic::include_proto!("blob");
}

use proto::blob_service_client::BlobServiceClient;
use proto::put_request;
use proto::put_request::Data::*;
use proto::PutRequest;

use crate::constants::{BLOB_ADDRESS, MPSC_CHANNEL_BUFFER_CAPACITY};
use anyhow::bail;
use crate::RUNTIME;
use lazy_static::lazy_static;
use libc;
use libc::c_char;
use std::collections::HashMap;
use std::ffi::CStr;
use std::sync::Mutex;
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
  rx_handle: JoinHandle<anyhow::Result<(), anyhow::Error>>,
}

lazy_static! {
  // todo: we should consider limiting the clients size,
  // if every client is able to allocate up to 4MB data at a time
  static ref CLIENTS: Mutex<HashMap<String, BidiClient>> =
    Mutex::new(HashMap::new());
  static ref ERROR_MESSAGES: Mutex<Vec<String>> =
    Mutex::new(Vec::new());
}

fn is_initialized(holder: &str) -> anyhow::Result<bool, anyhow::Error> {
  match CLIENTS.lock() {
    Ok(clients) => Ok(clients.contains_key(holder)),
    _ => bail!("couldn't access client")
  }
}

pub fn put_client_initialize_cxx(
  holder: &str,
) -> anyhow::Result<(), anyhow::Error> {
  if is_initialized(&holder)? {
    put_client_terminate_cxx(&holder.to_string())?;
  }
  if is_initialized(&holder)? {
    bail!("client cannot be initialized twice");
  }
  // grpc
  if let Ok(mut grpc_client) =
    RUNTIME.block_on(async { BlobServiceClient::connect(BLOB_ADDRESS).await })
  {
    let (request_thread_tx, mut request_thread_rx) =
      mpsc::channel::<PutRequestData>(MPSC_CHANNEL_BUFFER_CAPACITY);

    let outbound = async_stream::stream! {
      let mut maybe_error: Option<String> = None;
      while let Some(data) = request_thread_rx.recv().await {
        let request_data: Option<put_request::Data> = match data.field_index {
          1 => {
            match String::from_utf8(data.data) {
              Ok(utf8_data) => Some(Holder(utf8_data)),
              _ => {
                maybe_error = Some("invalid utf-8".to_string());
                break;
              },
            }
          }
          2 => {
            match String::from_utf8(data.data).ok() {
              Some(utf8_data) => Some(BlobHash(utf8_data)),
              None => {
                maybe_error = Some("invalid utf-8".to_string());
                break;
              },
            }
          }
          3 => {
            Some(DataChunk(data.data))
          }
          _ => {
            maybe_error = Some(format!("invalid field index value {}", data.field_index));
            break;
          }
        };
        if let Some (unpacked_data) = request_data {
          let request = PutRequest {
            data: Some(unpacked_data),
          };
          yield request;
        } else {
          maybe_error = Some("an error occured, aborting connection".to_string());
          break;
        }
      }
      if let Some(error) = maybe_error {
        // todo consider handling this differently
        println!("an error occured in the stream: {}", error);
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
            let maybe_response_message = inner_response.message().await?;
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
                bail!("response queue full");
              }
            }
            if !result {
              break;
            }
          }
        }
        Err(err) => {
          bail!(err.to_string());
        }
      };
      Ok(())
    });

    if is_initialized(&holder)? {
      bail!(format!(
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
      (*clients).insert(holder.to_string(), client);
      return Ok(());
    }
    bail!(format!("could not access client for holder {}", holder));
  }
  bail!("could not successfully connect to the blob server");
}

pub fn put_client_blocking_read_cxx(
  holder: &str,
) -> anyhow::Result<String, anyhow::Error> {
  Ok(RUNTIME.block_on(async {
    if let Ok(mut clients) = CLIENTS.lock() {
      let maybe_client = clients.get_mut(holder);
      if let Some(client) = maybe_client {
        if let Some(data) = client.rx.recv().await {
          return Ok(data);
        } else {
          bail!("couldn't receive data via client's receiver");
        }
      } else {
        bail!(format!(
          "no client detected for {} in blocking read",
          holder
        ));
      }
    } else {
      bail!("couldn't access clients");
    }
  })?)
}

/**
 * field index:
 * 1 - holder (utf8 string)
 * 2 - blob hash (utf8 string)
 * 3 - data chunk (bytes)
 */
pub fn put_client_write_cxx(
  holder: &str,
  field_index: usize,
  data: *const c_char,
) -> anyhow::Result<(), anyhow::Error> {
  let data_c_str: &CStr = unsafe { CStr::from_ptr(data) };
  let data_bytes: Vec<u8> = data_c_str.to_bytes().to_vec();

  RUNTIME.block_on(async {
    if let Ok(clients) = CLIENTS.lock() {
      let maybe_client = clients.get(&holder.to_string());
      if let Some(client) = maybe_client {
        client
          .tx
          .send(PutRequestData {
            field_index,
            data: data_bytes,
          })
          .await?;
        return Ok(());
      }
      bail!(format!("no client detected for {} in write", holder));
    } else {
      bail!("couldn't access clients");
    }
  })?;
  Ok(())
}

pub fn put_client_terminate_cxx(
  holder: &str,
) -> anyhow::Result<(), anyhow::Error> {
  if !is_initialized(&holder)? {
    return Ok(());
  }

  if let Ok(mut clients) = CLIENTS.lock() {
    let maybe_client = clients.remove(&holder.to_string());
    if let Some(client) = maybe_client {
      drop(client.tx);
      RUNTIME.block_on(async { client.rx_handle.await? })?;
    } else {
      bail!("no client detected in terminate");
    }
  } else {
    bail!("couldn't access client");
  }

  if is_initialized(&holder)? {
    bail!("client transmitter handler released properly");
  }
  Ok(())
}
