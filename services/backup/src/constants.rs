// Assorted constants

pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;

// Configuration defaults

pub const DEFAULT_GRPC_SERVER_PORT: u64 = 50051;
pub const DEFAULT_LOCALSTACK_URL: &str = "http://localhost:4566";
pub const DEFAULT_BLOB_SERVICE_URL: &str = "http://localhost:50053";

// Environment variable names

pub const SANDBOX_ENV_VAR: &str = "COMM_SERVICES_SANDBOX";
pub const LOG_LEVEL_ENV_VAR: &str =
  tracing_subscriber::filter::EnvFilter::DEFAULT_ENV;
