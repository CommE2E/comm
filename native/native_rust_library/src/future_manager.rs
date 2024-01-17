use crate::RUNTIME;
use lazy_static::lazy_static;
use std::any::Any;
use std::convert::Infallible;
use std::{collections::HashMap, future::Future};
use tokio::sync::oneshot;
use tokio::sync::Mutex;

lazy_static! {
  static ref FUTURE_MANAGER: Mutex<FutureManager> = Default::default();
}

pub mod ffi {
  use super::*;

  pub fn resolve_unit_future(future_id: usize) {
    RUNTIME.spawn(async move {
      super::resolve_future(future_id, Ok(())).await;
    });
  }

  pub fn reject_future(future_id: usize, error: String) {
    RUNTIME.spawn(async move {
      super::resolve_future::<Infallible>(future_id, Err(error)).await;
    });
  }
}

#[derive(Debug, Default)]
pub struct FutureManager {
  promises:
    HashMap<usize, oneshot::Sender<Result<Box<dyn Any + Send>, String>>>,
  next_id: usize,
}

pub async fn new_future<T: 'static + Send>(
) -> (usize, impl Future<Output = Result<T, String>>) {
  let mut manager = FUTURE_MANAGER.lock().await;

  let id = manager.next_id;
  manager.next_id += 1;

  let (tx, rx) = oneshot::channel();
  manager.promises.insert(id, tx);

  let future = async move {
    match rx.await {
      Ok(Ok(any_value)) => {
        if let Ok(boxed_value) = any_value.downcast() {
          Ok(*boxed_value)
        } else {
          Err("Type mismatch".to_string())
        }
      }
      Ok(Err(err)) => Err(err),
      Err(_) => Err("Promise sender dropped".to_string()),
    }
  };

  (id, future)
}

pub async fn resolve_future<T: 'static + Send>(
  id: usize,
  value: Result<T, String>,
) {
  let mut manager = FUTURE_MANAGER.lock().await;

  let tx = match manager.promises.remove(&id) {
    Some(tx) => tx,
    None => return,
  };

  let boxed_value =
    value.map(|value| Box::new(value) as Box<dyn Any + Send + 'static>);
  let _ = tx.send(boxed_value);
}
