#[cxx::bridge]
mod ffi {
  extern "Rust" {}
}

mod constants;

use constants::MPSC_CHANNEL_BUFFER_CAPACITY;
use tokio::sync::mpsc;
use tokio::runtime::Runtime;
use tokio::task::JoinHandle;
#[macro_use]
extern crate lazy_static;
use std::sync::Mutex;
extern crate libc;
use libc::c_char;
use std::ffi::CStr;
pub struct Client {
  tx: Option<mpsc::Sender<String>>,
  rt: Option<Runtime>,
  handle: Option<JoinHandle<()>>,
}

lazy_static! {
  pub static ref CLIENT: Mutex<Client> =
    Mutex::new(Client { tx: None, rt: None, handle: None });
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
pub extern "C" fn rust_process(data: *const c_char) -> () {
  println!("[RUST] [rust_process] begin");
  let c_str: &CStr = unsafe { CStr::from_ptr(data) };
  let str: String = c_str.to_str().unwrap().to_owned();
  println!("[RUST] [rust_process] data string: {}", str);

  // this works
  let rt = CLIENT.lock().expect("access client").rt.take().unwrap();
  rt.block_on(async {
    CLIENT
      .lock()
      .expect("access client")
      .tx
      .as_ref()
      .expect("access client's transmitter")
      .send(str)
      .await
      .expect("send data to receiver");
  });
  CLIENT.lock().expect("access client").rt = Some(rt);
  println!("[RUST] [rust_process] end");
}

#[no_mangle]
pub extern "C" fn rust_terminate() -> () {
  unimplemented!();
}
