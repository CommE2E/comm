use libc::c_char;
use std::ffi::{CStr, CString};
use std::sync::Mutex;
use tracing::error;

pub fn report_error(
  error_messages: &Mutex<Vec<String>>,
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
  error_messages: &Mutex<Vec<String>>,
) -> Result<(), String> {
  if let Ok(errors) = error_messages.lock() {
    return match errors.is_empty() {
      true => Ok(()),
      false => Err(errors.join("\n")),
    };
  }
  Err("could not access error messages".to_string())
}

pub fn c_char_pointer_to_string(
  c_char_pointer: *const c_char,
) -> Result<String, String> {
  let holder_cstr: &CStr = unsafe { CStr::from_ptr(c_char_pointer) };
  match holder_cstr.to_str() {
    Ok(result) => Ok(result.to_owned()),
    Err(err) => Err(err.to_string()),
  }
}

pub fn c_char_pointer_to_string_new(
  c_char_pointer: *const c_char,
) -> anyhow::Result<String, anyhow::Error> {
  let holder_cstr: &CStr = unsafe { CStr::from_ptr(c_char_pointer) };
  Ok(holder_cstr.to_str()?.to_owned())
}

pub fn string_to_c_char_pointer(
  signs: &String,
) -> Result<*const c_char, String> {
  let cstr = CString::new((&signs).as_bytes());
  match cstr {
    Ok(result) => Ok(result.as_ptr()),
    Err(err) => Err(err.to_string()),
  }
}

pub fn string_to_c_char_pointer_new(
  signs: &String,
) -> anyhow::Result<*const c_char, anyhow::Error> {
  Ok(CString::new((&signs).as_bytes())?.as_ptr())
}
