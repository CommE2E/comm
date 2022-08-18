#[cxx::bridge]
mod ffi {
  extern "Rust" {
    fn rust_initialize_cxx() -> ();
    unsafe fn rust_process_cxx(data: *const c_char) -> ();
    fn rust_terminate_cxx() -> ();
  }
}

mod constants;

use constants::MPSC_CHANNEL_BUFFER_CAPACITY;
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use lazy_static::lazy_static;
use std::sync::{Arc, Mutex};
extern crate libc;
use libc::c_char;

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

pub fn rust_initialize_cxx() -> () {
  println!("[RUST] initializing");
  assert!(
    CLIENT.lock().expect("access client").tx.is_none(),
    "client's transmitter cannot be initialized twice"
  );
  assert!(
    CLIENT.lock().expect("access client").handle.is_none(),
    "runtime cannot be initialized twice"
  );
  let (tx, mut rx): (mpsc::Sender<String>, mpsc::Receiver<String>) =
    mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
  let handle = RUNTIME.spawn(async move {
    println!("[RUST] [receiver] begin");
    while let Some(data) = rx.recv().await {
      println!("[RUST] [receiver] data: {}", data);
    }
    println!("[RUST] [receiver] done");
  });
  CLIENT.lock().expect("access client").handle = Some(handle);
  CLIENT.lock().expect("access client").tx = Some(tx);
  println!("[RUST] initialized");
}

#[no_mangle]
pub fn rust_process_cxx(_data: *const c_char) -> () {
  unimplemented!();
}

#[no_mangle]
pub fn rust_terminate_cxx() -> () {
  unimplemented!();
}
