mod constants;
mod get_client;
mod put_client;

use put_client::{
  put_client_blocking_read_cxx, put_client_initialize_cxx,
  put_client_terminate_cxx, put_client_write_cxx,
};
#[cxx::bridge]
mod ffi {
  extern "Rust" {
    fn put_client_initialize_cxx() -> Result<()>;
    unsafe fn put_client_write_cxx(
      field_index: usize,
      data: *const c_char,
    ) -> Result<()>;
    fn put_client_blocking_read_cxx() -> Result<String>;
    fn put_client_terminate_cxx() -> Result<()>;
  }
}
