use crate::constants::MPSC_CHANNEL_BUFFER_CAPACITY;
use lazy_static::lazy_static;
use libc;
use libc::c_char;
use std::ffi::CStr;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;

struct BidiClient {
  tx: Option<mpsc::Sender<String>>,
  tx_handle: Option<JoinHandle<()>>,

  rx: Option<mpsc::Receiver<String>>,
  rx_handle: Option<JoinHandle<()>>,
}

lazy_static! {
  static ref CLIENT: Arc<Mutex<BidiClient>> =
    Arc::new(Mutex::new(BidiClient {
      tx: None,
      tx_handle: None,
      rx: None,
      rx_handle: None,
    }));
  static ref RUNTIME: Runtime = Runtime::new().unwrap();
}

fn is_initialized() -> bool {
  if CLIENT.lock().expect("access client").tx.is_none() {
    return false;
  }
  if CLIENT
    .lock()
    .expect("access client")
    .tx_handle
    .is_none()
  {
    return false;
  }
  return true;
}

pub fn put_client_initialize_cxx() -> () {
  println!("[RUST] initializing");
  assert!(!is_initialized(), "client cannot be initialized twice");
  // spawn transmitter thread
  let (transmitter_thread_tx, mut transmitter_thread_rx): (
    mpsc::Sender<String>,
    mpsc::Receiver<String>,
  ) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
  let tx_handle = RUNTIME.spawn(async move {
    println!("[RUST] [transmitter_thread] begin");
    while let Some(data) = transmitter_thread_rx.recv().await {
      println!("[RUST] [transmitter_thread] data: {}", data);
      // todo: send throug grpc here
    }
    println!("[RUST] [transmitter_thread] done");
  });
  // spawn receiver thread
  let (receiver_thread_tx, mut receiver_thread_rx): (
    mpsc::Sender<String>,
    mpsc::Receiver<String>,
  ) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
  let rx_handle = RUNTIME.spawn(async move {
    println!("[RUST] [receiver_thread] begin");
    // here get responses from grpc and send them with the receiver_thread_tx
    println!("[RUST] [receiver_thread] done");
  });

  CLIENT.lock().expect("access client").tx_handle =
    Some(tx_handle);
  CLIENT.lock().expect("access client").tx = Some(transmitter_thread_tx);
  CLIENT.lock().expect("access client").rx_handle = Some(rx_handle);
  CLIENT.lock().expect("access client").rx = Some(receiver_thread_rx);
  println!("[RUST] initialized");
}

pub fn put_client_blocking_read_cxx() -> () {
  RUNTIME.block_on(async {
    let mut rx: mpsc::Receiver<String> = CLIENT
      .lock()
      .expect("access client")
      .rx
      .take()
      .expect("access client's receiver");
    if let Some(data) = rx.recv().await {
      println!("received data {}", data);
    }
    CLIENT.lock().expect("access client").rx = Some(rx);
  });
}

pub fn put_client_write_cxx(data: *const c_char) -> () {
  println!("[RUST] [put_client_process] begin");
  let data_c_str: &CStr = unsafe { CStr::from_ptr(data) };
  let data_str: String = data_c_str.to_str().unwrap().to_owned();
  println!("[RUST] [put_client_process] data string: {}", data_str);

  RUNTIME.block_on(async {
    CLIENT
      .lock()
      .expect("access client")
      .tx
      .as_ref()
      .expect("access client's transmitter")
      .send(data_str)
      .await
      .expect("send data to receiver");
  });
  println!("[RUST] [put_client_process] end");
}

pub fn put_client_terminate_cxx() -> () {
  println!("[RUST] put_client_terminating");
  let tx_handle = CLIENT
    .lock()
    .expect("access client")
    .tx_handle
    .take()
    .unwrap();
  let rx_handle = CLIENT
    .lock()
    .expect("access client")
    .rx_handle
    .take()
    .unwrap();

  drop(CLIENT.lock().expect("access client").tx.take().unwrap());
  RUNTIME.block_on(async {
    tx_handle.await.unwrap();
    rx_handle.await.unwrap();
  });

  assert!(
    !is_initialized(),
    "client transmitter handler released properly"
  );
  println!("[RUST] put_client_terminated");
}
