#[cxx::bridge]
pub mod ffi {
  enum GRPCStatusCodes {
    Ok,
    Cancelled,
    Unknown,
    InvalidArgument,
    DeadlineExceeded,
    NotFound,
    AlreadyExists,
    PermissionDenied,
    ResourceExhausted,
    FailedPrecondition,
    Aborted,
    OutOfRange,
    Unimplemented,
    Internal,
    Unavailable,
    DataLoss,
    Unauthenticated,
  }
  struct GrpcResult {
    statusCode: GRPCStatusCodes,
    errorText: String,
  }
  struct SessionSignatureResult {
    toSign: String,
    grpcStatus: GrpcResult,
  }

  unsafe extern "C++" {
    include!("tunnelbroker/src/libcpp/Tunnelbroker.h");
    pub fn initialize();
    pub fn getConfigParameter(parameter: &str) -> Result<String>;
    pub fn isSandbox() -> Result<bool>;
    pub fn sessionSignatureHandler(deviceID: &str) -> SessionSignatureResult;
  }
}
