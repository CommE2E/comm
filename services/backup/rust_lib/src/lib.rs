#[cxx::bridge]
mod ffi {
  extern "Rust" {
    fn rust_is_initialized_cxx() -> bool;
    fn rust_initialize_cxx() -> ();
    unsafe fn rust_process_cxx(_: *const c_char) -> ();
    fn rust_terminate_cxx() -> ();
  }
}

use lazy_static::lazy_static;
use libc;
use libc::c_char;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;

pub struct Client {
  tx: Option<mpsc::Sender<String>>,
  handle: Option<JoinHandle<()>>,
}

lazy_static! {
  pub static ref CLIENT: Arc<Mutex<Client>> = Arc::new(Mutex::new(Client {
    tx: None,
    handle: None
  }));
  pub static ref RUNTIME: Runtime = Runtime::new().unwrap();
}

pub fn rust_is_initialized_cxx() -> bool {
  if CLIENT.lock().expect("access client").tx.is_none() {
    return false;
  }
  if CLIENT.lock().expect("access client").handle.is_none() {
    return false;
  }
  return true;
}

pub fn rust_initialize_cxx() -> () {
  unimplemented!();
}

pub fn rust_process_cxx(_: *const c_char) -> () {
  unimplemented!();
}

pub fn rust_terminate_cxx() -> () {
  unimplemented!();
}
