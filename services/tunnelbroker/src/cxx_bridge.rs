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
  struct SessionItem {
    deviceID: String,
    publicKey: String,
    notifyToken: String,
    deviceType: i32,
    appVersion: String,
    deviceOS: String,
    isOnline: bool,
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
    pub fn getSessionItem(sessionID: &str) -> Result<SessionItem>;
  }
}
