// Secrets

pub const SECRETS_DIRECTORY: &str = "secrets";
pub const SECRETS_FILE_NAME: &str = "secret_key";
pub const SECRETS_FILE_EXTENSION: &str = "txt";

// DynamoDB

pub const USERS_TABLE: &str = "identity-users";
pub const USERS_TABLE_PARTITION_KEY: &str = "userID";
pub const USERS_TABLE_REGISTRATION_ATTRIBUTE: &str = "pakeRegistrationData";
pub const USERS_TABLE_USERNAME_ATTRIBUTE: &str = "username";
pub const USERS_TABLE_DEVICES_ATTRIBUTE: &str = "devices";
pub const USERS_TABLE_DEVICES_MAP_ATTRIBUTE_NAME: &str = "signingPublicKey";
pub const USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE: &str = "walletAddress";
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

// Tokio

pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;
pub const IDENTITY_SERVICE_SOCKET_ADDR: &str = "[::]:50051";

// Token

pub const ACCESS_TOKEN_LENGTH: usize = 512;

// Temporary config

pub const AUTH_TOKEN: &str = "AUTH_TOKEN";

// Nonce

pub const NONCE_LENGTH: usize = 17;
