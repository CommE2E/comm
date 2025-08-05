use tokio::time::Duration;

pub const GRPC_TX_QUEUE_SIZE: usize = 32;
pub const GRPC_SERVER_PORT: u16 = 50051;
pub const GRPC_KEEP_ALIVE_PING_INTERVAL: Duration = Duration::from_secs(3);
pub const GRPC_KEEP_ALIVE_PING_TIMEOUT: Duration = Duration::from_secs(10);

pub const SOCKET_HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(6);

pub const MAX_RMQ_MSG_PRIORITY: u8 = 10;
pub const DDB_RMQ_MSG_PRIORITY: u8 = 10;
pub const CLIENT_RMQ_MSG_PRIORITY: u8 = 1;
pub const RMQ_CONSUMER_TAG: &str = "tunnelbroker";
pub const WS_SESSION_CLOSE_AMQP_MSG: &str = "SessionClose";
pub const ENV_APNS_CONFIG: &str = "APNS_CONFIG";
pub const ENV_FCM_CONFIG: &str = "FCM_CONFIG";
pub const ENV_WEB_PUSH_CONFIG: &str = "WEB_PUSH_CONFIG";
pub const ENV_WNS_CONFIG: &str = "WNS_CONFIG";
pub const COMM_SERVICES_USE_JSON_LOGS: &str = "COMM_SERVICES_USE_JSON_LOGS";

pub const LOG_LEVEL_ENV_VAR: &str =
  tracing_subscriber::filter::EnvFilter::DEFAULT_ENV;
pub const FCM_ACCESS_TOKEN_GENERATION_THRESHOLD: u64 = 5 * 60;

pub const PUSH_SERVICE_REQUEST_TIMEOUT: Duration = Duration::from_secs(8);

pub const FARCASTER_REQUEST_TIMEOUT: Duration = Duration::from_secs(8);

pub mod dynamodb {
  // This table holds messages which could not be immediately delivered to
  // a device.
  //
  // - (primary key) = (deviceID: Partition Key, createdAt: Sort Key)
  // - deviceID: The public key of a device's olm identity key
  // - payload: Message to be delivered. See shared/tunnelbroker_messages.
  // - messageID = [createdAt]#[clientMessageID]
  //    - createdAd:  UNIX timestamp of when the item was inserted.
  //      Timestamp is needed to order the messages correctly to the device.
  //      Timestamp format is ISO 8601 to handle lexicographical sorting.
  //    - clientMessageID: Message ID generated on client using UUID Version 4.
  pub mod undelivered_messages {
    pub const TABLE_NAME: &str = "tunnelbroker-undelivered-messages";
    pub const PARTITION_KEY: &str = "deviceID";
    pub const DEVICE_ID: &str = "deviceID";
    pub const PAYLOAD: &str = "payload";
    pub const MESSAGE_ID: &str = "messageID";
    pub const SORT_KEY: &str = "messageID";
  }

  // This table holds a device token associated with a device.
  //
  // - (primary key) = (deviceID: Partition Key)
  // - deviceID: The public key of a device's olm identity key.
  // - deviceToken: Token to push services uploaded by device.
  // - tokenInvalid: Information is token is invalid.
  pub mod device_tokens {
    pub const TABLE_NAME: &str = "tunnelbroker-device-tokens";
    pub const PARTITION_KEY: &str = "deviceID";
    pub const DEVICE_ID: &str = "deviceID";
    pub const DEVICE_TOKEN: &str = "deviceToken";
    pub const TOKEN_INVALID: &str = "tokenInvalid";
    pub const PLATFORM: &str = "platform";

    pub const DEVICE_TOKEN_INDEX_NAME: &str = "deviceToken-index";
  }
}

// Log Error Types

pub mod error_types {
  pub const AMQP_ERROR: &str = "AMQP Error";
  pub const DDB_ERROR: &str = "DDB Error";
  pub const FCM_ERROR: &str = "FCM Error";
  pub const APNS_ERROR: &str = "APNs Error";
  pub const WEB_PUSH_ERROR: &str = "Web Push Error";
  pub const WNS_ERROR: &str = "WNS Error";
  pub const IDENTITY_ERROR: &str = "Identity Error";
  pub const WEBSOCKET_ERROR: &str = "Websocket Error";
  pub const SERVER_ERROR: &str = "Server Error";
}
