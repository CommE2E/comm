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
    fn put_client_initialize_cxx() -> ();
    unsafe fn put_client_write_cxx(data: *const c_char) -> ();
    fn put_client_blocking_read_cxx() -> ();
    fn put_client_terminate_cxx() -> ();
  }
}
