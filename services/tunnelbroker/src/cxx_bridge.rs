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
  struct MessageItem {
    messageID: String,
    fromDeviceID: String,
    toDeviceID: String,
    payload: String,
    blobHashes: String,
    deliveryTag: u64,
  }

  unsafe extern "C++" {
    include!("tunnelbroker/src/libcpp/Tunnelbroker.h");
    pub fn initialize();
    pub fn getConfigParameter(parameter: &str) -> Result<String>;
    pub fn isConfigParameterSet(parameter: &str) -> Result<bool>;
    pub fn isSandbox() -> Result<bool>;
    pub fn sessionSignatureHandler(deviceID: &str) -> SessionSignatureResult;
    pub fn getSavedNonceToSign(deviceID: &str) -> Result<String>;
    pub fn newSessionHandler(
      deviceID: &str,
      publicKey: &str,
      deviceType: i32,
      deviceAppVersion: &str,
      deviceOS: &str,
      notifyToken: &str,
    ) -> NewSessionResult;
    pub fn getSessionItem(sessionID: &str) -> Result<SessionItem>;
    pub fn updateSessionItemIsOnline(
      sessionID: &str,
      isOnline: bool,
    ) -> Result<()>;
    pub fn updateSessionItemDeviceToken(
      sessionID: &str,
      newNotifToken: &str,
    ) -> Result<()>;
    pub fn getMessagesFromDatabase(deviceID: &str) -> Result<Vec<MessageItem>>;
    pub fn sendMessages(messages: &Vec<MessageItem>) -> Result<Vec<String>>;
    pub fn eraseMessagesFromAMQP(deviceID: &str) -> Result<()>;
    pub fn ackMessageFromAMQP(deliveryTag: u64) -> Result<()>;
    pub fn waitMessageFromDeliveryBroker(deviceID: &str)
      -> Result<MessageItem>;
    pub fn removeMessages(
      deviceID: &str,
      messagesIDs: &Vec<String>,
    ) -> Result<()>;
    pub fn deleteDeliveryBrokerQueueIfEmpty(deviceID: &str) -> Result<()>;
  }
}
