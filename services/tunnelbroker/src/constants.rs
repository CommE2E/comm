use tokio::time::Duration;

pub const GRPC_TX_QUEUE_SIZE: usize = 32;
pub const GRPC_SERVER_PORT: u16 = 50051;
pub const GRPC_KEEP_ALIVE_PING_INTERVAL: Duration = Duration::from_secs(3);
pub const GRPC_KEEP_ALIVE_PING_TIMEOUT: Duration = Duration::from_secs(10);

pub const LOG_LEVEL_ENV_VAR: &str =
  tracing_subscriber::filter::EnvFilter::DEFAULT_ENV;

pub mod dynamodb {
  // This table holds messages which could not be immediately delivered to
  // a device.
  //
  // - (primary key) = (deviceID: Partition Key, createdAt: Sort Key)
  // - deviceID: The public key of a device's olm identity key
  // - payload: Message to be delivered. See shared/tunnelbroker_messages.
  // - createdAt: UNIX timestamp of when the item was inserted.
  //     Timestamp is needed to order the messages correctly to the device.
  pub mod undelivered_messages {
    pub const TABLE_NAME: &str = "tunnelbroker-undelivered-messages";
    pub const PARTITION_KEY: &str = "deviceID";
    pub const DEVICE_ID: &str = "deviceID";
    pub const PAYLOAD: &str = "payload";
    pub const CREATED_AT: &str = "createdAt";
    pub const SORT_KEY: &str = "createdAt";
  }
}
