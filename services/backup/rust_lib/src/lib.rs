#[cxx::bridge]
mod ffi {
  extern "Rust" {
    fn test_function() -> i32;
  }
}

pub fn test_function() -> i32 {
  0
}
