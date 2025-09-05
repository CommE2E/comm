pub mod auth;
pub mod backup;
pub mod blob;
pub mod constants;
#[cfg(feature = "crypto")]
pub mod crypto;
#[cfg(feature = "aws")]
pub mod database;
#[cfg(feature = "http")]
pub mod http;
pub mod sensitive_data;
pub mod shared;
pub mod tools;

#[allow(unused_imports)]
mod reexports {
  #[cfg(feature = "blob-client")]
  pub use {bytes, reqwest};

  #[cfg(feature = "http")]
  pub use {actix_web, http};

  #[cfg(feature = "aws")]
  pub mod aws {
    pub use aws_config as config;
    pub use aws_sdk_dynamodb as ddb;
    pub use aws_sdk_secretsmanager as secretsmanager;

    // commonly used types
    pub use config::SdkConfig as AwsConfig;
    pub use ddb::Client as DynamoDBClient;
    pub use ddb::Error as DynamoDBError;
  }
}

#[allow(unused_imports)]
pub use reexports::*;
