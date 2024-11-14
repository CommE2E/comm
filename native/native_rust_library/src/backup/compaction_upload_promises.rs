use crate::handle_string_result_as_callback;
use lazy_static::lazy_static;
use std::{collections::HashMap, sync::Mutex};

lazy_static! {
  static ref COMPACTION_UPLOAD_PROMISES: Mutex<HashMap<String, u32>> =
    Default::default();
}

pub fn insert(backup_id: String, promise_id: u32) {
  if let Ok(mut backups_to_promises) = COMPACTION_UPLOAD_PROMISES.lock() {
    backups_to_promises.insert(backup_id, promise_id);
  };
}

pub fn resolve(backup_id: &str, result: Result<(), String>) {
  let Ok(mut backups_to_promises) = COMPACTION_UPLOAD_PROMISES.lock() else {
    return;
  };
  let Some(promise_id) = backups_to_promises.remove(backup_id) else {
    return;
  };

  let backup_id_result: Result<String, String> =
    result.map(|_| backup_id.to_string());

  handle_string_result_as_callback(backup_id_result, promise_id);
}
