use crate::constants::MPSC_CHANNEL_BUFFER_CAPACITY;
use lazy_static::lazy_static;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
extern crate libc;
use libc::c_char;
use std::ffi::CStr;

struct Client {
  tx: Option<mpsc::Sender<String>>,
  handle: Option<JoinHandle<()>>,
}

lazy_static! {
  static ref CLIENT: Arc<Mutex<Client>> = Arc::new(Mutex::new(Client {
    tx: None,
    handle: None
  }));
  static ref RUNTIME: Runtime = Runtime::new().unwrap();
}

fn is_initialized() -> bool {
  if CLIENT.lock().expect("access client").tx.is_none() {
    return false;
  }
  if CLIENT.lock().expect("access client").handle.is_none() {
    return false;
  }
  return true;
}

pub fn put_client_initialize_cxx() -> () {
  println!("[RUST] initializing");
  assert!(!is_initialized(), "client cannot be initialized twice");
  let (tx, mut rx): (mpsc::Sender<String>, mpsc::Receiver<String>) =
    mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
  let handle = RUNTIME.spawn(async move {
    println!("[RUST] [receiver] begin");
    while let Some(data) = rx.recv().await {
      println!("[RUST] [receiver] data: {}", data);
      // todo: send throug grpc here
    }
    println!("[RUST] [receiver] done");
  });
  CLIENT.lock().expect("access client").handle = Some(handle);
  CLIENT.lock().expect("access client").tx = Some(tx);
  println!("[RUST] initialized");
}

pub fn put_client_send_cxx(data: *const c_char) -> () {
  println!("[RUST] [put_client_process] begin");
  let c_str: &CStr = unsafe { CStr::from_ptr(data) };
  let str: String = c_str.to_str().unwrap().to_owned();
  println!("[RUST] [put_client_process] data string: {}", str);

  // this works
  RUNTIME.block_on(async {
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
  println!("[RUST] [put_client_process] end");
}

pub fn put_client_terminate_cxx() -> () {
  println!("[RUST] put_client_terminating");
  let handle = CLIENT.lock().expect("access client").handle.take().unwrap();

  drop(CLIENT.lock().expect("access client").tx.take().unwrap());
  RUNTIME.block_on(async {
    handle.await.unwrap();
  });

  assert!(!is_initialized(), "client handler released properly");
  println!("[RUST] put_client_terminated");
}
