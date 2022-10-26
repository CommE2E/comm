#[cxx::bridge]
pub mod ffi {
  struct GrpcResult {
    statusCode: u8,
    errorText: String,
  }
  struct SessionSignatureResult {
    toSign: String,
    grpcStatus: GrpcResult,
  }

  unsafe extern "C++" {
    include!("tunnelbroker/src/libcpp/Tunnelbroker.h");
    pub fn initialize();
    pub fn sessionSignatureHandler(deviceID: &str) -> SessionSignatureResult;
  }
}
