#![allow(unused)]
use crate::cxx_promise_manager::{STRING_PROMISE_STORE, UNIT_PROMISE_STORE};
use crate::ffi::{secure_store_get_sync, secure_store_set_sync};

pub async fn set(key: &str, value: String) -> Result<(), String> {
  let (id, promise) = UNIT_PROMISE_STORE.lock().unwrap().new_promise();
  secure_store_set_sync(key, value, id);
  promise.await
}

pub async fn get(key: &str) -> Result<String, String> {
  let (id, promise) = STRING_PROMISE_STORE.lock().unwrap().new_promise();
  secure_store_get_sync(key, id);
  promise.await
}
