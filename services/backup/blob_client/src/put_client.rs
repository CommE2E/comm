use libc::c_char;

pub fn put_client_initialize_cxx() -> Result<(), String> {
  unimplemented!();
}

pub fn put_client_blocking_read_cxx() -> Result<String, String> {
  unimplemented!();
}

/**
 * field index:
 * 0 - holder (utf8 string)
 * 1 - blob hash (utf8 string)
 * 2 - data chunk (bytes)
 */
pub fn put_client_write_cxx(
  field_index: usize,
  data: *const c_char,
) -> Result<(), String> {
  unimplemented!();
}

pub fn put_client_terminate_cxx() -> Result<(), String> {
  unimplemented!();
}
