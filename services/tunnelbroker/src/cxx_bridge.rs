#[cxx::bridge]
pub mod ffi {
  unsafe extern "C++" {
    include!("tunnelbroker/src/libcpp/Tunnelbroker.h");
    pub fn initialize();
    pub fn getConfigParameter(parameter: &str) -> Result<String>;
    pub fn isSandbox() -> Result<bool>;
  }
}
