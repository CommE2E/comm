#[cxx::bridge]
mod ffi {
  extern "Rust" {}
}

mod constants;

use constants::MPSC_CHANNEL_BUFFER_CAPACITY;
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
#[macro_use]
extern crate lazy_static;
use std::sync::Mutex;
extern crate libc;
use libc::c_char;
pub struct Client {
  tx: Option<mpsc::Sender<String>>,
  rt: Option<Runtime>,
  handle: Option<JoinHandle<()>>,
}

lazy_static! {
  pub static ref CLIENT: Mutex<Client> = Mutex::new(Client {
    tx: None,
    rt: None,
    handle: None
  });
}

#[no_mangle]
pub extern "C" fn rust_initialize() -> () {
  println!("[RUST] initializing");
  assert!(
    CLIENT.lock().expect("access client").tx.is_none(),
    "client's transmitter cannot be initialized twice"
  );
  assert!(
    CLIENT.lock().expect("access client").rt.is_none(),
    "runtime cannot be initialized twice"
  );
  assert!(
    CLIENT.lock().expect("access client").handle.is_none(),
    "runtime cannot be initialized twice"
  );
  CLIENT.lock().expect("access client").rt = Some(Runtime::new().unwrap());
  let (tx, mut rx): (mpsc::Sender<String>, mpsc::Receiver<String>) =
    mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
  let rt = CLIENT.lock().expect("access client").rt.take().unwrap();
  let handle = rt.spawn(async move {
    println!("[RUST] [receiver] begin");
    while let Some(data) = rx.recv().await {
      println!("[RUST] [receiver] data: {}", data);
    }
    println!("[RUST] [receiver] done");
  });
  CLIENT.lock().expect("access client").handle = Some(handle);
  CLIENT.lock().expect("access client").rt = Some(rt);
  CLIENT.lock().expect("access client").tx = Some(tx);
  println!("[RUST] initialized");
}

#[no_mangle]
pub extern "C" fn rust_process(_data: *const c_char) -> () {
  unimplemented!();
}

#[no_mangle]
pub extern "C" fn rust_terminate() -> () {
  unimplemented!();
}
