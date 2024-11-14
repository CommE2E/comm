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

  let result_with_id: Result<String, String> = match result {
    Ok(_) => Ok(backup_id.to_string()),
    Err(e) => Err(e),
  };

  handle_string_result_as_callback(result_with_id, promise_id);
}
