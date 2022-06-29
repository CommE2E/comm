// Secrets

pub const SECRETS_DIRECTORY: &str = "secrets";
pub const SECRETS_FILE_NAME: &str = "secret_key";
pub const SECRETS_FILE_EXTENSION: &str = "txt";

// DynamoDB

pub const PAKE_REGISTRATION_TABLE: &str = "identity-pake-registration";
pub const PAKE_REGISTRATION_TABLE_PARTITION_KEY: &str = "userID";
pub const PAKE_REGISTRATION_TABLE_DATA_ATTRIBUTE: &str = "pakeRegistrationData";

pub const ACCESS_TOKEN_TABLE: &str = "identity-tokens";
pub const ACCESS_TOKEN_TABLE_PARTITION_KEY: &str = "userID";
pub const ACCESS_TOKEN_SORT_KEY: &str = "deviceID";
pub const ACCESS_TOKEN_TABLE_CREATED_ATTRIBUTE: &str = "created";
pub const ACCESS_TOKEN_TABLE_AUTH_TYPE_ATTRIBUTE: &str = "authType";
pub const ACCESS_TOKEN_TABLE_VALID_ATTRIBUTE: &str = "valid";
pub const ACCESS_TOKEN_TABLE_TOKEN_ATTRIBUTE: &str = "token";

// Tokio

pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;
pub const IDENTITY_SERVICE_SOCKET_ADDR: &str = "[::]:50051";

// Token

pub const ACCESS_TOKEN_LENGTH: usize = 512;
