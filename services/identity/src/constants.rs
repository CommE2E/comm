use tokio::time::Duration;

// Secrets

pub const SECRETS_DIRECTORY: &str = "secrets";
pub const SECRETS_SETUP_FILE: &str = "server_setup.txt";

// DynamoDB

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
pub const USERS_TABLE_USERNAME_LOWER_ATTRIBUTE_NAME: &str = "usernameLower";
pub const USERS_TABLE_USERNAME_INDEX: &str = "username-index";
pub const USERS_TABLE_WALLET_ADDRESS_INDEX: &str = "walletAddress-index";
pub const USERS_TABLE_FARCASTER_ID_INDEX: &str = "farcasterID-index";
pub const USERS_TABLE_USERNAME_LOWER_INDEX: &str = "usernameLower-index";

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
pub const RESERVED_USERNAMES_TABLE_USERNAME_LOWER_ATTRIBUTE: &str =
  "usernameLower";
pub const RESERVED_USERNAMES_TABLE_USERNAME_LOWER_INDEX: &str =
  "usernameLower-index";
pub const RESERVED_USERNAMES_TABLE_USER_ID_INDEX: &str = "userID-index";

// Users table social proof attribute
pub const SOCIAL_PROOF_MESSAGE_ATTRIBUTE: &str = "siweMessage";
pub const SOCIAL_PROOF_SIGNATURE_ATTRIBUTE: &str = "siweSignature";

pub mod devices_table {
  /// table name
  pub const NAME: &str = "identity-devices";
  pub const TIMESTAMP_INDEX_NAME: &str = "deviceList-timestamp-index";
  pub const DEVICE_ID_INDEX_NAME: &str = "deviceID-index";

  /// partition key
  pub const ATTR_USER_ID: &str = "userID";
  /// sort key
  pub const ATTR_ITEM_ID: &str = "itemID";

  // itemID prefixes (one shouldn't be a prefix of the other)
  pub const DEVICE_ITEM_KEY_PREFIX: &str = "device-";
  pub const DEVICE_LIST_KEY_PREFIX: &str = "devicelist-";

  // device-specific attrs
  pub const ATTR_DEVICE_KEY_INFO: &str = "deviceKeyInfo";
  pub const ATTR_CONTENT_PREKEY: &str = "contentPreKey";
  pub const ATTR_NOTIF_PREKEY: &str = "notifPreKey";
  pub const ATTR_PLATFORM_DETAILS: &str = "platformDetails";
  pub const ATTR_LOGIN_TIME: &str = "loginTime";

  // IdentityKeyInfo constants
  pub const ATTR_KEY_PAYLOAD: &str = "keyPayload";
  pub const ATTR_KEY_PAYLOAD_SIGNATURE: &str = "keyPayloadSignature";

  // PreKey constants
  pub const ATTR_PREKEY: &str = "preKey";
  pub const ATTR_PREKEY_SIGNATURE: &str = "preKeySignature";

  // PlatformDetails constants
  pub const ATTR_DEVICE_TYPE: &str = "deviceType";
  pub const ATTR_CODE_VERSION: &str = "codeVersion";
  pub const ATTR_STATE_VERSION: &str = "stateVersion";
  pub const ATTR_MAJOR_DESKTOP_VERSION: &str = "majorDesktopVersion";

  // device-list-specific attrs
  pub const ATTR_TIMESTAMP: &str = "timestamp";
  pub const ATTR_DEVICE_IDS: &str = "deviceIDs";
  pub const ATTR_CURRENT_SIGNATURE: &str = "curPrimarySignature";
  pub const ATTR_LAST_SIGNATURE: &str = "lastPrimarySignature";

  // one-time key constants
  pub const ATTR_CONTENT_OTK_COUNT: &str = "contentOTKCount";
  pub const ATTR_NOTIF_OTK_COUNT: &str = "notifOTKCount";

  // deprecated attributes
  pub const OLD_ATTR_DEVICE_TYPE: &str = "deviceType";
  pub const OLD_ATTR_CODE_VERSION: &str = "codeVersion";
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
pub const NONCE_TTL_DURATION: Duration = Duration::from_secs(900); // seconds

// Device list

pub const DEVICE_LIST_TIMESTAMP_VALID_FOR: Duration = Duration::from_secs(300);

// Workflows in progress

pub const WORKFLOWS_IN_PROGRESS_TTL_DURATION: Duration =
  Duration::from_secs(120);

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
  pub const HTTP_LOG: &str = "HTTP Error";
}

// Tonic Status Messages
pub mod tonic_status_messages {
  pub const UNEXPECTED_MESSAGE_DATA: &str = "unexpected_message_data";
  pub const SIGNATURE_INVALID: &str = "signature_invalid";
  pub const MALFORMED_KEY: &str = "malformed_key";
  pub const VERIFICATION_FAILED: &str = "verification_failed";
  pub const MALFORMED_PAYLOAD: &str = "malformed_payload";
  pub const INVALID_DEVICE_LIST_PAYLOAD: &str = "invalid_device_list_payload";
  pub const USERNAME_ALREADY_EXISTS: &str = "username_already_exists";
  pub const USERNAME_RESERVED: &str = "username_reserved";
  pub const WALLET_ADDRESS_TAKEN: &str = "wallet_address_taken";
  pub const WALLET_ADDRESS_NOT_RESERVED: &str = "wallet_address_not_reserved";
  pub const WALLET_ADDRESS_MISMATCH: &str = "wallet_address_mismatch";
  pub const DEVICE_ID_ALREADY_EXISTS: &str = "device_id_already_exists";
  pub const USER_NOT_FOUND: &str = "user_not_found";
  pub const INVALID_NONCE: &str = "invalid_nonce";
  pub const NONCE_EXPIRED: &str = "nonce_expired";
  pub const FID_TAKEN: &str = "fid_taken";
  pub const CANNOT_LINK_FID: &str = "cannot_link_fid";
  pub const INVALID_PLATFORM_METADATA: &str = "invalid_platform_metadata";
  pub const MISSING_CREDENTIALS: &str = "missing_credentials";
  pub const BAD_CREDENTIALS: &str = "bad_credentials";
  pub const SESSION_NOT_FOUND: &str = "session_not_found";
  pub const INVALID_TIMESTAMP: &str = "invalid_timestamp";
  pub const INVALID_USERNAME: &str = "invalid_username";
  pub const USERNAME_NOT_RESERVED: &str = "username_not_reserved";
  pub const NEED_KEYSERVER_MESSAGE_TO_CLAIM_USERNAME: &str =
    "need_keyserver_message_to_claim_username";
  pub const UNEXPECTED_INITIAL_DEVICE_LIST: &str =
    "unexpected_initial_device_list";
  pub const DEVICE_LIST_ERROR: &str = "device_list_error";
  pub const DEVICE_NOT_IN_DEVICE_LIST: &str = "device_not_in_device_list";
  pub const NO_IDENTIFIER_PROVIDED: &str = "no_identifier_provided";
  pub const USER_ALREADY_HAS_KEYSERVER: &str = "user_already_has_keyserver";
  pub const RETRY: &str = "retry";
  pub const INVALID_DEVICE_LIST_UPDATE: &str = "invalid_device_list_update";
  pub const INVALID_DEVICE_LIST_SIGNATURE: &str =
    "invalid_device_list_signature";
  pub const UNEXPECTED_ERROR: &str = "unexpected_error";
  pub const NO_DEVICE_LIST: &str = "no_device_list";
  pub const USER_ID_MISSING: &str = "user_id_missing";
  pub const DEVICE_ID_MISSING: &str = "device_id_missing";
  pub const MISSING_CONTENT_KEYS: &str = "missing_content_keys";
  pub const MISSING_NOTIF_KEYS: &str = "missing_notif_keys";
  pub const KEYSERVER_NOT_FOUND: &str = "keyserver_not_found";
  pub const PASSWORD_USER: &str = "password_user";
  pub const WALLET_USER: &str = "wallet_user";
  pub const INVALID_MESSAGE: &str = "invalid_message";
  pub const INVALID_MESSAGE_FORMAT: &str = "invalid_message_format";
  pub const MISSING_PLATFORM_OR_CODE_VERSION_METADATA: &str =
    "missing_platform_or_code_version_metadata";
  pub const MISSING_KEY: &str = "missing_key";
  pub const MESSAGE_NOT_AUTHENTICATED: &str = "message_not_authenticated";
  pub const RETRY_FROM_NATIVE: &str = "retry_from_native";
  pub const USER_IS_NOT_STAFF: &str = "user_is_not_staff";
  pub const USE_NEW_FLOW: &str = "use_new_flow";
  pub const USE_V1_FLOW: &str = "use_v1_flow";
}

// Tunnelbroker
pub const TUNNELBROKER_GRPC_ENDPOINT: &str = "TUNNELBROKER_GRPC_ENDPOINT";
pub const DEFAULT_TUNNELBROKER_ENDPOINT: &str = "http://localhost:50051";

// Backup
pub const BACKUP_SERVICE_URL: &str = "BACKUP_SERVICE_URL";
pub const DEFAULT_BACKUP_SERVICE_URL: &str = "http://localhost:50052";

// Blob
pub const BLOB_SERVICE_URL: &str = "BLOB_SERVICE_URL";
pub const DEFAULT_BLOB_SERVICE_URL: &str = "http://localhost:50053";

// X3DH key management

// Threshold for requesting more one_time keys
pub const ONE_TIME_KEY_MINIMUM_THRESHOLD: usize = 5;
// Number of keys to be refreshed when below the threshold
pub const ONE_TIME_KEY_REFRESH_NUMBER: u32 = 5;

// Minimum supported code versions

pub const MIN_SUPPORTED_NATIVE_VERSION: u64 = 446;
pub const MIN_SUPPORTED_WEB_VERSION: u64 = 146;

// Request metadata

pub mod request_metadata {
  pub const CODE_VERSION: &str = "code_version";
  pub const STATE_VERSION: &str = "state_version";
  pub const MAJOR_DESKTOP_VERSION: &str = "major_desktop_version";
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
  pub const DEFAULT_ALLOW_HEADERS: [&str; 12] = [
    "x-grpc-web",
    "content-type",
    "x-user-agent",
    "grpc-timeout",
    "authorization",
    super::request_metadata::CODE_VERSION,
    super::request_metadata::STATE_VERSION,
    super::request_metadata::MAJOR_DESKTOP_VERSION,
    super::request_metadata::DEVICE_TYPE,
    super::request_metadata::USER_ID,
    super::request_metadata::DEVICE_ID,
    super::request_metadata::ACCESS_TOKEN,
  ];
  pub const ALLOW_ORIGIN_LIST: &str = "ALLOW_ORIGIN_LIST";
}

// Tracing

pub const COMM_SERVICES_USE_JSON_LOGS: &str = "COMM_SERVICES_USE_JSON_LOGS";
pub const REDACT_SENSITIVE_DATA: &str = "REDACT_SENSITIVE_DATA";

// Regex

pub const VALID_USERNAME_REGEX_STRING: &str =
  r"^[a-zA-Z0-9][a-zA-Z0-9-_]{0,190}$";

// Retry

pub mod retry {
  // exponential backoff config
  pub const MAX_ATTEMPTS: usize = 8;
}

// One-time keys
pub const ONE_TIME_KEY_UPLOAD_LIMIT_PER_ACCOUNT: usize = 24;
pub const ONE_TIME_KEY_SIZE: usize = 43; // as defined in olm
pub const MAX_ONE_TIME_KEYS: usize = 100; // as defined in olm

// Comm staff
pub mod staff {
  pub const STAFF_USER_IDS: [&str; 1] = ["256"];
  pub const AUTHORITATIVE_KEYSERVER_OWNER_USER_ID: &str = "256";
}
