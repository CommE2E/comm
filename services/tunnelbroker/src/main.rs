pub mod constants;
pub mod cxx_bridge;

pub fn main() {
  cxx_bridge::ffi::initialize();
}
