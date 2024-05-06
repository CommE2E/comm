use tokio::time::Duration;

// Secrets

pub const SECRETS_DIRECTORY: &str = "secrets";
pub const SECRETS_SETUP_FILE: &str = "server_setup.txt";

// DynamoDB

// User table information, supporting opaque_ke 2.0 and X3DH information

// Users can sign in either through username+password or Eth wallet.
//
// This structure should be aligned with the messages defined in
// shared/protos/identity_unauthenticated.proto
//
// Structure for a user should be:
// {
//   userID: String,
//   opaqueRegistrationData: Option<String>,
//   username: Option<String>,
//   walletAddress: Option<String>,
//   devices: HashMap<String, Device>
// }
//
// A device is defined as:
// {
//     deviceType: String, # client or keyserver
//     keyPayload: String,
//     keyPayloadSignature: String,
//     identityPreKey: String,
//     identityPreKeySignature: String,
//     identityOneTimeKeys: Vec<String>,
//     notifPreKey: String,
//     notifPreKeySignature: String,
//     notifOneTimeKeys: Vec<String>,
//     socialProof: Option<String>
//   }
// }
//
// Additional context:
// "devices" uses the signing public identity key of the device as a key for the devices map
// "keyPayload" is a JSON encoded string containing identity and notif keys (both signature and verification)
// if "deviceType" == "keyserver", then the device will not have any notif key information

pub const USERS_TABLE: &str = "identity-users";
pub const USERS_TABLE_PARTITION_KEY: &str = "userID";
pub const USERS_TABLE_REGISTRATION_ATTRIBUTE: &str = "opaqueRegistrationData";
pub const USERS_TABLE_USERNAME_ATTRIBUTE: &str = "username";
pub const USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME: &str =
  "deviceType";
pub const USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE: &str = "walletAddress";
pub const USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME: &str = "socialProof";
pub const USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME: &str =
  "deviceListTimestamp";
pub const USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME: &str = "farcasterID";
pub const USERS_TABLE_USERNAME_INDEX: &str = "username-index";
pub const USERS_TABLE_WALLET_ADDRESS_INDEX: &str = "walletAddress-index";
pub const USERS_TABLE_FARCASTER_ID_INDEX: &str = "farcasterID-index";

pub mod token_table {
  pub const NAME: &str = "identity-tokens";
  pub const PARTITION_KEY: &str = "userID";
  pub const SORT_KEY: &str = "signingPublicKey";
  pub const ATTR_CREATED: &str = "created";
  pub const ATTR_AUTH_TYPE: &str = "authType";
  pub const ATTR_VALID: &str = "valid";
  pub const ATTR_TOKEN: &str = "token";
}

pub const NONCE_TABLE: &str = "identity-nonces";
pub const NONCE_TABLE_PARTITION_KEY: &str = "nonce";
pub const NONCE_TABLE_CREATED_ATTRIBUTE: &str = "created";
pub const NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE: &str = "expirationTime";
pub const NONCE_TABLE_EXPIRATION_TIME_UNIX_ATTRIBUTE: &str =
  "expirationTimeUnix";

pub const WORKFLOWS_IN_PROGRESS_TABLE: &str = "identity-workflows-in-progress";
pub const WORKFLOWS_IN_PROGRESS_PARTITION_KEY: &str = "id";
pub const WORKFLOWS_IN_PROGRESS_WORKFLOW_ATTRIBUTE: &str = "workflow";
pub const WORKFLOWS_IN_PROGRESS_TABLE_EXPIRATION_TIME_UNIX_ATTRIBUTE: &str =
  "expirationTimeUnix";

// Usernames reserved because they exist in Ashoat's keyserver already
pub const RESERVED_USERNAMES_TABLE: &str = "identity-reserved-usernames";
pub const RESERVED_USERNAMES_TABLE_PARTITION_KEY: &str = "username";
pub const RESERVED_USERNAMES_TABLE_USER_ID_ATTRIBUTE: &str = "userID";

// Users table social proof attribute
pub const SOCIAL_PROOF_MESSAGE_ATTRIBUTE: &str = "siweMessage";
pub const SOCIAL_PROOF_SIGNATURE_ATTRIBUTE: &str = "siweSignature";

pub mod devices_table {
  /// table name
  pub const NAME: &str = "identity-devices";
  pub const TIMESTAMP_INDEX_NAME: &str = "deviceList-timestamp-index";

  /// partition key
  pub const ATTR_USER_ID: &str = "userID";
  /// sort key
  pub const ATTR_ITEM_ID: &str = "itemID";

  // itemID prefixes (one shouldn't be a prefix of the other)
  pub const DEVICE_ITEM_KEY_PREFIX: &str = "device-";
  pub const DEVICE_LIST_KEY_PREFIX: &str = "devicelist-";

  // device-specific attrs
  pub const ATTR_DEVICE_TYPE: &str = "deviceType";
  pub const ATTR_DEVICE_KEY_INFO: &str = "deviceKeyInfo";
  pub const ATTR_CONTENT_PREKEY: &str = "contentPreKey";
  pub const ATTR_NOTIF_PREKEY: &str = "notifPreKey";

  // IdentityKeyInfo constants
  pub const ATTR_KEY_PAYLOAD: &str = "keyPayload";
  pub const ATTR_KEY_PAYLOAD_SIGNATURE: &str = "keyPayloadSignature";

  // PreKey constants
  pub const ATTR_PREKEY: &str = "preKey";
  pub const ATTR_PREKEY_SIGNATURE: &str = "preKeySignature";

  // device-list-specific attrs
  pub const ATTR_TIMESTAMP: &str = "timestamp";
  pub const ATTR_DEVICE_IDS: &str = "deviceIDs";
  pub const ATTR_CURRENT_SIGNATURE: &str = "curPrimarySignature";
  pub const ATTR_LAST_SIGNATURE: &str = "lastPrimarySignature";

  // migration-specific attrs
  pub const ATTR_CODE_VERSION: &str = "codeVersion";
  pub const ATTR_LOGIN_TIME: &str = "loginTime";

  // one-time key constants
  pub const ATTR_CONTENT_OTK_COUNT: &str = "contentOTKCount";
  pub const ATTR_NOTIF_OTK_COUNT: &str = "notifOTKCount";
}

// One time keys table, which need to exist in their own table to ensure
// atomicity of additions and removals
pub mod one_time_keys_table {
  pub const NAME: &str = "identity-one-time-keys";
  pub const PARTITION_KEY: &str = "userID#deviceID#olmAccount";
  pub const SORT_KEY: &str = "timestamp#keyNumber";
  pub const ATTR_ONE_TIME_KEY: &str = "oneTimeKey";
}

// Tokio

pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;
pub const IDENTITY_SERVICE_SOCKET_ADDR: &str = "[::]:50054";
pub const IDENTITY_SERVICE_WEBSOCKET_ADDR: &str = "[::]:51004";

pub const SOCKET_HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(3);

// Token

pub const ACCESS_TOKEN_LENGTH: usize = 512;

// Temporary config

pub const AUTH_TOKEN: &str = "COMM_IDENTITY_SERVICE_AUTH_TOKEN";
pub const KEYSERVER_PUBLIC_KEY: &str = "KEYSERVER_PUBLIC_KEY";

// Nonce

pub const NONCE_LENGTH: usize = 17;
pub const NONCE_TTL_DURATION: Duration = Duration::from_secs(120); // seconds

// Device list

pub const DEVICE_LIST_TIMESTAMP_VALID_FOR: Duration = Duration::from_secs(300);

// Workflows in progress

pub const WORKFLOWS_IN_PROGRESS_TTL_DURATION: Duration =
  Duration::from_secs(120);

// Identity

pub const DEFAULT_IDENTITY_ENDPOINT: &str = "http://localhost:50054";

// LocalStack

pub const LOCALSTACK_ENDPOINT: &str = "LOCALSTACK_ENDPOINT";

// OPAQUE Server Setup

pub const OPAQUE_SERVER_SETUP: &str = "OPAQUE_SERVER_SETUP";

// Identity Search

pub const OPENSEARCH_ENDPOINT: &str = "OPENSEARCH_ENDPOINT";
pub const DEFAULT_OPENSEARCH_ENDPOINT: &str =
  "identity-search-domain.us-east-2.opensearch.localhost.localstack.cloud:4566";
pub const IDENTITY_SEARCH_INDEX: &str = "users";
pub const IDENTITY_SEARCH_RESULT_SIZE: u32 = 20;

// Log Error Types

pub mod error_types {
  pub const GENERIC_DB_LOG: &str = "DB Error";
  pub const OTK_DB_LOG: &str = "One-time Key DB Error";
  pub const DEVICE_LIST_DB_LOG: &str = "Device List DB Error";
  pub const TOKEN_DB_LOG: &str = "Token DB Error";
  pub const FARCASTER_DB_LOG: &str = "Farcaster DB Error";

  pub const SYNC_LOG: &str = "Sync Error";
  pub const SEARCH_LOG: &str = "Search Error";
  pub const SIWE_LOG: &str = "SIWE Error";
  pub const GRPC_SERVICES_LOG: &str = "gRPC Services Error";
  pub const TUNNELBROKER_LOG: &str = "Tunnelbroker Error";
}

// Tunnelbroker
pub const TUNNELBROKER_GRPC_ENDPOINT: &str = "TUNNELBROKER_GRPC_ENDPOINT";
pub const DEFAULT_TUNNELBROKER_ENDPOINT: &str = "http://localhost:50051";

// X3DH key management

// Threshold for requesting more one_time keys
pub const ONE_TIME_KEY_MINIMUM_THRESHOLD: usize = 5;
// Number of keys to be refreshed when below the threshold
pub const ONE_TIME_KEY_REFRESH_NUMBER: u32 = 5;

// Minimum supported code versions

pub const MIN_SUPPORTED_NATIVE_VERSION: u64 = 270;

// Request metadata

pub mod request_metadata {
  pub const CODE_VERSION: &str = "code_version";
  pub const DEVICE_TYPE: &str = "device_type";
  pub const USER_ID: &str = "user_id";
  pub const DEVICE_ID: &str = "device_id";
  pub const ACCESS_TOKEN: &str = "access_token";
}

// CORS

pub mod cors {
  use std::time::Duration;

  pub const DEFAULT_MAX_AGE: Duration = Duration::from_secs(24 * 60 * 60);
  pub const DEFAULT_EXPOSED_HEADERS: [&str; 3] =
    ["grpc-status", "grpc-message", "grpc-status-details-bin"];
  pub const DEFAULT_ALLOW_HEADERS: [&str; 9] = [
    "x-grpc-web",
    "content-type",
    "x-user-agent",
    "grpc-timeout",
    super::request_metadata::CODE_VERSION,
    super::request_metadata::DEVICE_TYPE,
    super::request_metadata::USER_ID,
    super::request_metadata::DEVICE_ID,
    super::request_metadata::ACCESS_TOKEN,
  ];
  pub const ALLOW_ORIGIN_LIST: &str = "ALLOW_ORIGIN_LIST";
}

// Tracing

pub const COMM_SERVICES_USE_JSON_LOGS: &str = "COMM_SERVICES_USE_JSON_LOGS";

// Regex

pub const VALID_USERNAME_REGEX_STRING: &str =
  r"^[a-zA-Z0-9][a-zA-Z0-9-_]{0,190}$";

// Retry

// TODO: Replace this with `ExponentialBackoffConfig` from `comm-lib`
pub mod retry {
  pub const MAX_ATTEMPTS: usize = 8;

  pub const CONDITIONAL_CHECK_FAILED: &str = "ConditionalCheckFailed";
  pub const TRANSACTION_CONFLICT: &str = "TransactionConflict";
}

// One-time keys
pub const ONE_TIME_KEY_UPLOAD_LIMIT_PER_ACCOUNT: usize = 24;
pub const ONE_TIME_KEY_SIZE: usize = 43; // as defined in olm
pub const MAX_ONE_TIME_KEYS: usize = 100; // as defined in olm
