use libc::c_char;
use std::ffi::{CStr, CString};

pub fn c_char_pointer_to_string(
  c_char_pointer: *const c_char,
) -> anyhow::Result<String, anyhow::Error> {
  let holder_cstr: &CStr = unsafe { CStr::from_ptr(c_char_pointer) };
  Ok(holder_cstr.to_str()?.to_owned())
}

pub fn string_to_c_char_pointer(
  signs: &String,
) -> anyhow::Result<*const c_char, anyhow::Error> {
  Ok(CString::new((&signs).as_bytes())?.as_ptr())
}
