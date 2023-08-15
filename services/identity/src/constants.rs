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

// One time keys table, which need to exist in their own table to ensure
// atomicity of additions and removals
pub mod one_time_keys_table {
  // The `PARTITION_KEY` will contain "notification_${deviceID}" or
  // "content_${deviceID}" to allow for both key sets to coexist in the same table
  pub const NAME: &'static str = "identity-one-time-keys";
  pub const PARTITION_KEY: &'static str = "deviceID";
  pub const DEVICE_ID: &'static str = PARTITION_KEY;
  pub const SORT_KEY: &'static str = "oneTimeKey";
  pub const ONE_TIME_KEY: &'static str = SORT_KEY;
}

// Tokio

pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;
pub const IDENTITY_SERVICE_SOCKET_ADDR: &str = "[::]:50054";

// Token

pub const ACCESS_TOKEN_LENGTH: usize = 512;

// Temporary config

pub const AUTH_TOKEN: &str = "COMM_IDENTITY_SERVICE_AUTH_TOKEN";
pub const KEYSERVER_PUBLIC_KEY: &str = "KEYSERVER_PUBLIC_KEY";

// Nonce

pub const NONCE_LENGTH: usize = 17;
pub const NONCE_TTL_DURATION: i64 = 30;

// LocalStack

pub const LOCALSTACK_ENDPOINT: &str = "LOCALSTACK_ENDPOINT";

// OPAQUE Server Setup

pub const OPAQUE_SERVER_SETUP: &str = "OPAQUE_SERVER_SETUP";

// Tunnelbroker
pub const TUNNELBROKER_GRPC_ENDPOINT: &str = "TUNNELBROKER_GRPC_ENDPOINT";
pub const DEFAULT_TUNNELBROKER_ENDPOINT: &str = "http://localhost:50051";

// X3DH key management

// Threshold for requesting more one_time keys
pub const ONE_TIME_KEY_MINIMUM_THRESHOLD: usize = 5;
// Number of keys to be refreshed when below the threshold
pub const ONE_TIME_KEY_REFRESH_NUMBER: u32 = 5;
