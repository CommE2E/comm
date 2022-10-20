#[cxx::bridge]
mod ffi {
  unsafe extern "C++" {
    include!("tunnelbroker/src/libcpp/Tunnelbroker.h");
    pub fn initialize();
  }
}

pub fn main() {
  ffi::initialize();
}
