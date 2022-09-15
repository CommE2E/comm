mod constants;
mod get_client;
mod put_client;
mod tools;

use lazy_static::lazy_static;
use tokio::runtime;

use put_client::{
  put_client_blocking_read_cxx, put_client_initialize_cxx,
  put_client_terminate_cxx, put_client_write_cxx,
};

use get_client::{
  get_client_blocking_read_cxx, get_client_initialize_cxx,
  get_client_terminate_cxx,
};

lazy_static! {
  static ref RUNTIME: runtime::Runtime = runtime::Runtime::new()
    .expect("Unable to create tokio runtime");
}

#[cxx::bridge]
mod ffi {
  extern "Rust" {
    unsafe fn put_client_initialize_cxx(
      holder_char: *const c_char,
    ) -> Result<()>;
    unsafe fn put_client_write_cxx(
      holder_char: *const c_char,
      field_index: usize,
      data: *const c_char,
    ) -> Result<()>;
    unsafe fn put_client_blocking_read_cxx(
      holder_char: *const c_char,
    ) -> Result<String>;
    unsafe fn put_client_terminate_cxx(
      holder_char: *const c_char,
    ) -> Result<()>;
    unsafe fn get_client_initialize_cxx(
      holder_char: *const c_char,
    ) -> Result<()>;
    unsafe fn get_client_blocking_read_cxx(
      holder_char: *const c_char,
    ) -> Result<Vec<u8>>;
    unsafe fn get_client_terminate_cxx(
      holder_char: *const c_char,
    ) -> Result<()>;
  }
}
