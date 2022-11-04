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
  struct NewSessionResult {
    sessionID: String,
    grpcStatus: GrpcResult,
  }

  unsafe extern "C++" {
    include!("tunnelbroker/src/libcpp/Tunnelbroker.h");
    pub fn initialize();
    pub fn sessionSignatureHandler(deviceID: &str) -> SessionSignatureResult;
    pub fn newSessionHandler(
      deviceID: &str,
      publicKey: &str,
      signature: &str,
      deviceType: i32,
      deviceAppVersion: &str,
      deviceOS: &str,
      notifyToken: &str,
    ) -> NewSessionResult;
  }
}
