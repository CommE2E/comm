// 400KiB limit (in docs there is KB but they mean KiB) -
// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
// This includes both attribute names' and values' lengths
pub const DDB_ITEM_SIZE_LIMIT: usize = 1024 * 400;

// 4MB limit
// WARNING: use keeping in mind that grpc adds its own headers to messages
// https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
// so the message that actually is being sent over the network looks like this
// [Compressed-Flag] [Message-Length] [Message]
//    [Compressed-Flag]   1 byte  - added by grpc
//    [Message-Length]    4 bytes - added by grpc
//    [Message]           N bytes - actual data
// so for every message we get 5 additional bytes of data
// as mentioned here
// https://github.com/grpc/grpc/issues/15734#issuecomment-396962671
// grpc stream may contain more than one message
pub const GRPC_CHUNK_SIZE_LIMIT: usize = 4 * 1024 * 1024;
pub const GRPC_METADATA_SIZE_PER_MESSAGE: usize = 5;

/// Environment variable, that when set to `true` disables verifying access
/// token in service requests.
pub const DISABLE_CSAT_VERIFICATION_ENV_VAR: &str =
  "COMM_SERVICES_DISABLE_CSAT_VERIFICATION";

pub mod env_var {
  // Tracing

  pub const COMM_SERVICES_USE_JSON_LOGS: &str = "COMM_SERVICES_USE_JSON_LOGS";
  pub const REDACT_SENSITIVE_DATA: &str = "REDACT_SENSITIVE_DATA";
}

// Comm staff
pub mod staff {
  pub const STAFF_USER_IDS: [&str; 1] = ["256"];
  pub const AUTHORITATIVE_KEYSERVER_OWNER_USER_ID: &str = "256";
}
