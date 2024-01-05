// Secrets

pub const SECRETS_DIRECTORY: &str = "secrets";
pub const SECRETS_SETUP_FILE: &str = "server_setup.txt";

// DynamoDB

// User table information, supporting opaque_ke 2.0 and X3DH information

// Users can sign in either through username+password or Eth wallet.
//
// This structure should be aligned with the messages defined in
// shared/protos/identity_client.proto
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
pub const USERS_TABLE_DEVICES_ATTRIBUTE: &str = "devices";
pub const USERS_TABLE_DEVICES_MAP_DEVICE_TYPE_ATTRIBUTE_NAME: &str =
  "deviceType";
pub const USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME: &str =
  "keyPayload";
pub const USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_SIGNATURE_ATTRIBUTE_NAME: &str =
  "keyPayloadSignature";
pub const USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_ATTRIBUTE_NAME: &str =
  "identityPreKey";
pub const USERS_TABLE_DEVICES_MAP_CONTENT_PREKEY_SIGNATURE_ATTRIBUTE_NAME:
  &str = "identityPreKeySignature";
pub const USERS_TABLE_DEVICES_MAP_CONTENT_ONE_TIME_KEYS_ATTRIBUTE_NAME: &str =
  "identityOneTimeKeys";
pub const USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME: &str = "preKey";
pub const USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME: &str =
  "preKeySignature";
pub const USERS_TABLE_DEVICES_MAP_NOTIF_ONE_TIME_KEYS_ATTRIBUTE_NAME: &str =
  "notifOneTimeKeys";
pub const USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE: &str = "walletAddress";
pub const USERS_TABLE_DEVICES_MAP_SOCIAL_PROOF_ATTRIBUTE_NAME: &str =
  "socialProof";
pub const USERS_TABLE_DEVICELIST_TIMESTAMP_ATTRIBUTE_NAME: &str =
  "deviceListTimestamp";
pub const USERS_TABLE_USERNAME_INDEX: &str = "username-index";
pub const USERS_TABLE_WALLET_ADDRESS_INDEX: &str = "walletAddress-index";

pub const ACCESS_TOKEN_TABLE: &str = "identity-tokens";
pub const ACCESS_TOKEN_TABLE_PARTITION_KEY: &str = "userID";
pub const ACCESS_TOKEN_SORT_KEY: &str = "signingPublicKey";
pub const ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE: &str = "created";
pub const ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE: &str = "authType";
pub const ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE: &str = "valid";
pub const ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE: &str = "token";

pub const NONCE_TABLE: &str = "identity-nonces";
pub const NONCE_TABLE_PARTITION_KEY: &str = "nonce";
pub const NONCE_TABLE_CREATED_ATTRIBUTE: &str = "created";
pub const NONCE_TABLE_EXPIRATION_TIME_ATTRIBUTE: &str = "expirationTime";
pub const NONCE_TABLE_EXPIRATION_TIME_UNIX_ATTRIBUTE: &str =
  "expirationTimeUnix";

// Usernames reserved because they exist in Ashoat's keyserver already
pub const RESERVED_USERNAMES_TABLE: &str = "identity-reserved-usernames";
pub const RESERVED_USERNAMES_TABLE_PARTITION_KEY: &str = "username";
pub const RESERVED_USERNAMES_TABLE_USER_ID_ATTRIBUTE: &str = "userID";

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
  pub const ATTR_SOCIAL_PROOF: &str = "socialProof";

  // PreKey constants
  pub const ATTR_PREKEY: &str = "preKey";
  pub const ATTR_PREKEY_SIGNATURE: &str = "preKeySignature";

  // device-list-specific attrs
  pub const ATTR_TIMESTAMP: &str = "timestamp";
  pub const ATTR_DEVICE_IDS: &str = "deviceIDs";
}

// One time keys table, which need to exist in their own table to ensure
// atomicity of additions and removals
pub mod one_time_keys_table {
  // The `PARTITION_KEY` will contain "notification_${deviceID}" or
  // "content_${deviceID}" to allow for both key sets to coexist in the same table
  pub const NAME: &str = "identity-one-time-keys";
  pub const PARTITION_KEY: &str = "deviceID";
  pub const DEVICE_ID: &str = PARTITION_KEY;
  pub const SORT_KEY: &str = "oneTimeKey";
  pub const ONE_TIME_KEY: &str = SORT_KEY;
}

// One-time key constants for device info map
pub const CONTENT_ONE_TIME_KEY: &str = "contentOneTimeKey";
pub const NOTIF_ONE_TIME_KEY: &str = "notifOneTimeKey";

// Tokio

pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;
pub const IDENTITY_SERVICE_SOCKET_ADDR: &str = "[::]:50054";
pub const IDENTITY_SERVICE_WEBSOCKET_ADDR: &str = "[::]:51004";

// Token

pub const ACCESS_TOKEN_LENGTH: usize = 512;

// Temporary config

pub const AUTH_TOKEN: &str = "COMM_IDENTITY_SERVICE_AUTH_TOKEN";
pub const KEYSERVER_PUBLIC_KEY: &str = "KEYSERVER_PUBLIC_KEY";

// Nonce

pub const NONCE_LENGTH: usize = 17;
pub const NONCE_TTL_DURATION: i64 = 30;

// Identity

pub const DEFAULT_IDENTITY_ENDPOINT: &str = "http://localhost:50054";

// LocalStack

pub const LOCALSTACK_ENDPOINT: &str = "LOCALSTACK_ENDPOINT";

// OPAQUE Server Setup

pub const OPAQUE_SERVER_SETUP: &str = "OPAQUE_SERVER_SETUP";

// Opensearch Domain

pub const OPENSEARCH_ENDPOINT: &str = "OPENSEARCH_ENDPOINT";
pub const DEFAULT_OPENSEARCH_ENDPOINT: &str = "http://localhost:9200";

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
  pub const DEFAULT_ALLOW_ORIGIN: [&str; 2] =
    ["https://web.comm.app", "http://localhost:3000"];
}
