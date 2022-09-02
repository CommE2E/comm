use libc;
use libc::c_char;
use std::ffi::{CStr, CString};
use std::sync::{Arc, Mutex};
use tracing::error;

pub fn report_error(
  error_messages: &Arc<Mutex<Vec<String>>>,
  message: &str,
  label_provided: Option<&str>,
) {
  let label = match label_provided {
    Some(value) => format!("[{}]", value),
    None => "".to_string(),
  };
  println!("[RUST] {} Error: {}", label, message);
  if let Ok(mut error_messages_unpacked) = error_messages.lock() {
    error_messages_unpacked.push(message.to_string());
  }
  error!("could not access error messages");
}

pub fn check_error(
  error_messages: &Arc<Mutex<Vec<String>>>,
) -> Result<(), String> {
  if let Ok(errors) = error_messages.lock() {
    return match errors.is_empty() {
      true => Ok(()),
      false => Err(errors.join("\n")),
    };
  }
  Err("could not access error messages".to_string())
}

pub fn c_char_pointer_to_string(c_char_pointer: *const c_char) -> String {
  let holder_cstr: &CStr = unsafe { CStr::from_ptr(c_char_pointer) };
  return holder_cstr.to_str().unwrap().to_owned();
}

pub fn string_to_c_char_pointer(signs: &String) -> *const c_char {
  let result = CString::new((&signs).as_bytes()).unwrap();
  result.as_ptr()
}
