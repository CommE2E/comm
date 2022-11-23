use tokio::time::Duration;

pub const GRPC_TX_QUEUE_SIZE: usize = 32;
pub const GRPC_SERVER_PORT: u64 = 50051;
pub const GRPC_KEEP_ALIVE_PING_INTERVAL: Duration = Duration::from_secs(3);
pub const GRPC_KEEP_ALIVE_PING_TIMEOUT: Duration = Duration::from_secs(10);
