// Secrets

pub const SECRETS_DIRECTORY: &str = "secrets";
pub const SECRETS_FILE_NAME: &str = "secret_key";
pub const SECRETS_FILE_EXTENSION: &str = "txt";

// DynamoDB

// User table information, supporting opaque_ke 2.0 and X3DH information
pub mod opaque2 {
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
  //     identityPreKey: String,
  //     identityPreKeySignature: String,
  //     identityOneTimeKeys: Vec<String>,
  //     notifPreKey: String,
  //     notifPreKeySignature: String,
  //     notifOneTimeKeys: Vec<String>,
  //   }
  // }
  //
  // Additional context:
  // "devices" uses the signing public identity key of the device as a key for the devices map
  // "keyPayload" is a JSON encoded string containing identity and notif keys (both signature and verification)
  // if "deviceType" == "keyserver", then the device will not have any notif key information

  pub const USERS_TABLE: &str = "identity-users-opaque2";
  pub const USERS_TABLE_PARTITION_KEY: &str = "userID";
  pub const USERS_TABLE_REGISTRATION_ATTRIBUTE: &str = "opaqueRegistrationData";
  pub const USERS_TABLE_USERNAME_ATTRIBUTE: &str = "username";
  pub const USERS_TABLE_DEVICES_ATTRIBUTE: &str = "devices";
  pub const USERS_TABLE_DEVICES_MAP_KEY_PAYLOAD_ATTRIBUTE_NAME: &str =
    "keyPayload";
  pub const USERS_TABLE_DEVICES_MAP_IDENTITY_PREKEY_ATTRIBUTE_NAME: &str =
    "identityPreKey";
  pub const USERS_TABLE_DEVICES_MAP_IDENTITY_PREKEY_SIGNATURE_ATTRIBUTE_NAME:
    &str = "identityPreKeySignature";
  pub const USERS_TABLE_DEVICES_MAP_IDENTITY_ONETIME_KEYS_ATTRIBUTE_NAME: &str =
    "identityOneTimeKeys";
  pub const USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_ATTRIBUTE_NAME: &str =
    "preKey";
  pub const USERS_TABLE_DEVICES_MAP_NOTIF_PREKEY_SIGNATURE_ATTRIBUTE_NAME:
    &str = "preKeySignature";
  pub const USERS_TABLE_DEVICES_MAP_NOTIF_ONETIME_KEYS_ATTRIBUTE_NAME: &str =
    "notifOneTimeKeys";
  pub const USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE: &str = "walletAddress";
  pub const USERS_TABLE_USERNAME_INDEX: &str = "username-index";
  pub const USERS_TABLE_WALLET_ADDRESS_INDEX: &str = "walletAddress-index";
}

pub const USERS_TABLE: &str = "identity-users";
pub const USERS_TABLE_PARTITION_KEY: &str = "userID";
pub const USERS_TABLE_REGISTRATION_ATTRIBUTE: &str = "pakeRegistrationData";
pub const USERS_TABLE_USERNAME_ATTRIBUTE: &str = "username";
pub const USERS_TABLE_DEVICES_ATTRIBUTE: &str = "devices";
pub const USERS_TABLE_DEVICE_ATTRIBUTE_NAME: &str = "device";
pub const USERS_TABLE_DEVICES_MAP_ATTRIBUTE_NAME: &str = "signingPublicKey";
pub const USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE: &str = "walletAddress";
pub const USERS_TABLE_USERNAME_INDEX: &str = "username-index";
pub const USERS_TABLE_WALLET_ADDRESS_INDEX: &str = "walletAddress-index";
pub const USERS_TABLE_INITIALIZATION_INFO: &str = "initializationInfo";

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

// Tokio

pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;
pub const IDENTITY_SERVICE_SOCKET_ADDR: &str = "[::]:50054";

// Token

pub const ACCESS_TOKEN_LENGTH: usize = 512;

// Temporary config

pub const AUTH_TOKEN: &str = "COMM_IDENTITY_SERVICE_AUTH_TOKEN";

// Nonce

pub const NONCE_LENGTH: usize = 17;

// LocalStack

pub const LOCALSTACK_ENDPOINT: &str = "LOCALSTACK_ENDPOINT";
