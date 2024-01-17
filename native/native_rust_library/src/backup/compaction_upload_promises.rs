use crate::ffi::void_callback;
use std::{
  collections::HashMap,
  sync::{Arc, Mutex},
};

#[derive(Debug, Default)]
pub struct CompactionUploadPromises {
  backup_id_to_promise: Arc<Mutex<HashMap<String, u32>>>,
}

impl CompactionUploadPromises {
  pub fn insert(&self, backup_id: String, promise_id: u32) {
    if let Ok(mut backups_to_promises) = self.backup_id_to_promise.lock() {
      backups_to_promises.insert(backup_id, promise_id);
    };
  }

  pub fn resolve(&self, backup_id: &str) {
    let Ok(mut backups_to_promises) = self.backup_id_to_promise.lock() else {
      return;
    };
    let Some(promise_id) = backups_to_promises.remove(backup_id) else {
      return;
    };
    void_callback(String::new(), promise_id);
  }

  pub fn reject(&self, backup_id: &str, err: String) {
    let Ok(mut backups_to_promises) = self.backup_id_to_promise.lock() else {
      return;
    };
    let Some(promise_id) = backups_to_promises.remove(backup_id) else {
      return;
    };
    void_callback(err, promise_id);
  }
}
