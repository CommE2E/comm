use crate::constants::{MPSC_CHANNEL_BUFFER_CAPACITY};
use lazy_static::lazy_static;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use libc;
use libc::c_char;
use std::ffi::CStr;

struct BidiClient {
  tx: Option<mpsc::Sender<String>>,
  transmitter_handle: Option<JoinHandle<()>>,

  rx: Option<mpsc::Receiver<String>>,
  receiver_handle: Option<JoinHandle<()>>,
}

lazy_static! {
  static ref CLIENT: Arc<Mutex<BidiClient>> =
    Arc::new(Mutex::new(BidiClient {
      tx: None,
      transmitter_handle: None,
      rx: None,
      receiver_handle: None,
    }));
  static ref RUNTIME: Runtime = Runtime::new().unwrap();
  static ref ERROR_MESSAGES: Arc<Mutex<Vec<String>>> =
    Arc::new(Mutex::new(Vec::new()));
}

fn is_initialized() -> bool {
  if CLIENT.lock().expect("access client").tx.is_none() {
    return false;
  }
  if CLIENT
    .lock()
    .expect("access client")
    .transmitter_handle
    .is_none()
  {
    return false;
  }
  return true;
}

fn report_error(message: String) {
  ERROR_MESSAGES
    .lock()
    .expect("access error messages")
    .push(message);
}

fn check_error() -> Result<(), String> {
  let errors = ERROR_MESSAGES.lock().expect("access error messages");
  let mut errors_str_value = None;
  if !errors.is_empty() {
    errors_str_value = Some(errors.join("\n"));
  }
  return match errors_str_value {
    Some(value) => Err(value),
    None => Ok(()),
  };
}

pub fn put_client_initialize_cxx() -> Result<(), String> {
  println!("[RUST] initializing");
  assert!(!is_initialized(), "client cannot be initialized twice");
  // spawn transmitter thread
  let (transmitter_thread_tx, mut transmitter_thread_rx): (
    mpsc::Sender<String>,
    mpsc::Receiver<String>,
  ) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
  let transmitter_handle = RUNTIME.spawn(async move {
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
  let receiver_handle = RUNTIME.spawn(async move {
    println!("[RUST] [receiver_thread] begin");
    // here get responses from grpc and send them with the receiver_thread_tx
    println!("[RUST] [receiver_thread] done");
  });

  CLIENT.lock().expect("access client").transmitter_handle =
    Some(transmitter_handle);
  CLIENT.lock().expect("access client").tx = Some(transmitter_thread_tx);
  CLIENT.lock().expect("access client").receiver_handle = Some(receiver_handle);
  CLIENT.lock().expect("access client").rx = Some(receiver_thread_rx);
  println!("[RUST] initialized");
  Ok(())
}

pub fn put_client_blocking_read_cxx() -> Result<String, String> {
  let mut response: Option<String> = None;
  check_error()?;
  RUNTIME.block_on(async {
    let mut rx: mpsc::Receiver<String> = CLIENT
      .lock()
      .expect("access client")
      .rx
      .take()
      .expect("access client's receiver");
    if let Some(data) = rx.recv().await {
      println!("received data {}", data);
      response = Some(data);
    }
    CLIENT.lock().expect("access client").rx = Some(rx);
  });
  if response.is_none() {
    return Err("response not received properly".to_string());
  }
  Ok(response.unwrap())
}

pub fn put_client_write_cxx(
  field_index: usize,
  data: *const c_char,
) -> Result<(), String> {
  println!("[RUST] [put_client_process] begin");
  check_error()?;
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
  Ok(())
}

pub fn put_client_terminate_cxx() -> Result<(), String> {
  println!("[RUST] put_client_terminating");
  let transmitter_handle = CLIENT
    .lock()
    .expect("access client")
    .transmitter_handle
    .take()
    .unwrap();
  let receiver_handle = CLIENT
    .lock()
    .expect("access client")
    .receiver_handle
    .take()
    .unwrap();

  drop(CLIENT.lock().expect("access client").tx.take().unwrap());
  RUNTIME.block_on(async {
    transmitter_handle.await.unwrap();
    receiver_handle.await.unwrap();
  });

  assert!(
    !is_initialized(),
    "client transmitter handler released properly"
  );
  println!("[RUST] put_client_terminated");
  Ok(())
}
