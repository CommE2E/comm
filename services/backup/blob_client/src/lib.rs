mod constants;
mod get_client;
mod put_client;
mod tools;

use put_client::{
  put_client_blocking_read_cxx, put_client_initialize_cxx,
  put_client_terminate_cxx, put_client_write_cxx,
};

use get_client::{
  get_client_blocking_read_cxx, get_client_initialize_cxx,
  get_client_terminate_cxx,
};
#[cxx::bridge]
mod ffi {
  extern "Rust" {
    // put
    fn put_client_initialize_cxx() -> Result<()>;
    unsafe fn put_client_write_cxx(
      field_index: usize,
      data: *const c_char,
    ) -> Result<()>;
    fn put_client_blocking_read_cxx() -> Result<String>;
    fn put_client_terminate_cxx() -> Result<()>;
    // get
    unsafe fn get_client_initialize_cxx(
      holder_char: *const c_char,
    ) -> Result<()>;
    fn get_client_blocking_read_cxx() -> Result<Vec<u8>>;
    fn get_client_terminate_cxx() -> Result<()>;
  }
}
