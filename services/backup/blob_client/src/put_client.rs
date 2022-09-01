mod proto {
  tonic::include_proto!("blob");
}

use lazy_static::lazy_static;
use libc;
use libc::c_char;
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
  tx: mpsc::Sender<PutRequestData>,

  rx: mpsc::Receiver<String>,
  rx_handle: JoinHandle<()>,
}

lazy_static! {
  static ref CLIENT: Arc<Mutex<Option<BidiClient>>> =
    Arc::new(Mutex::new(None));
  static ref RUNTIME: Runtime = Runtime::new().unwrap();
  static ref ERROR_MESSAGES: Arc<Mutex<Vec<String>>> =
    Arc::new(Mutex::new(Vec::new()));
}

pub fn put_client_initialize_cxx() -> Result<(), String> {
  unimplemented!();
}

pub fn put_client_blocking_read_cxx() -> Result<String, String> {
  unimplemented!();
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
  unimplemented!();
}

pub fn put_client_terminate_cxx() -> Result<(), String> {
  unimplemented!();
}
