use lazy_static::lazy_static;
use std::{collections::HashMap, future::Future, sync::Mutex};
use tokio::sync::oneshot;

lazy_static! {
  pub static ref STRING_PROMISE_STORE: Mutex<PromiseStore<String>> =
    Mutex::default();
  pub static ref UNIT_PROMISE_STORE: Mutex<PromiseStore<()>> = Mutex::default();
}

#[derive(Debug, Default)]
pub struct PromiseStore<T> {
  promises: HashMap<usize, oneshot::Sender<Result<T, String>>>,
  next_id: usize,
}

#[allow(unused)]
impl<T> PromiseStore<T> {
  pub fn new_promise(
    &mut self,
  ) -> (usize, impl Future<Output = Result<T, String>>) {
    let id = self.next_id;
    self.next_id += 1;

    let (tx, rx) = oneshot::channel();
    self.promises.insert(id, tx);

    let future = async move {
      rx.await
        .unwrap_or_else(|_| Err("Promise sender dropped".to_string()))
    };

    (id, future)
  }

  pub fn resolve_promise(&mut self, id: usize, value: Result<T, String>) {
    let Some(tx) = self.promises.remove(&id) else {
      return;
    };
    let Ok(()) = tx.send(value) else {
      // The receiver has beed dropped
      return;
    };
  }
}

#[cfg(test)]
mod test {
  use super::*;
  use std::thread;

  #[tokio::test]
  async fn test_promises() {
    const TEST_STR: &str = "success";

    let (id, future) = STRING_PROMISE_STORE.lock().unwrap().new_promise();

    thread::spawn(move || {
      thread::sleep(std::time::Duration::from_millis(200));
      STRING_PROMISE_STORE
        .lock()
        .unwrap()
        .resolve_promise(id, Ok(TEST_STR.to_string()));
    });

    let result = future.await;
    assert_eq!(result, Ok(TEST_STR.to_string()));
  }
}
