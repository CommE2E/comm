use crate::ffi::{bool_callback, string_callback, void_callback};

pub fn handle_string_result_as_callback<E>(
  result: Result<String, E>,
  promise_id: u32,
) where
  E: std::fmt::Display,
{
  match result {
    Err(e) => string_callback(e.to_string(), promise_id, "".to_string()),
    Ok(r) => string_callback("".to_string(), promise_id, r),
  }
}

pub fn handle_void_result_as_callback<E>(result: Result<(), E>, promise_id: u32)
where
  E: std::fmt::Display,
{
  match result {
    Err(e) => void_callback(e.to_string(), promise_id),
    Ok(_) => void_callback("".to_string(), promise_id),
  }
}

pub fn handle_bool_result_as_callback<E>(
  result: Result<bool, E>,
  promise_id: u32,
) where
  E: std::fmt::Display,
{
  match result {
    Err(e) => bool_callback(e.to_string(), promise_id, false),
    Ok(r) => bool_callback("".to_string(), promise_id, r),
  }
}
