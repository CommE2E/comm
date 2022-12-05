mod constants;
mod get_client;
mod put_client;

use env_logger;
use lazy_static::lazy_static;
use log::info;
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
  static ref RUNTIME: runtime::Runtime = {
    env_logger::init();
    info!("Creating tokio runtime");
    runtime::Runtime::new().expect("Unable to create tokio runtime")
  };
}

#[cxx::bridge]
mod ffi {
  extern "Rust" {
    fn put_client_initialize_cxx(
      holder_char: &str,
    ) -> Result<()>;
    unsafe fn put_client_write_cxx(
      holder_char: &str,
      field_index: usize,
      data: *const c_char,
    ) -> Result<()>;
    fn put_client_blocking_read_cxx(
      holder_char: &str,
    ) -> Result<String>;
    fn put_client_terminate_cxx(
      holder_char: &str,
    ) -> Result<()>;
    fn get_client_initialize_cxx(
      holder_char: &str,
    ) -> Result<()>;
    fn get_client_blocking_read_cxx(
      holder_char: &str,
    ) -> Result<Vec<u8>>;
    fn get_client_terminate_cxx(
      holder_char: &str,
    ) -> Result<()>;
  }
}
