use comm_lib::aws::DynamoDBError;
use comm_lib::database::DBItemError;
use tracing::error;

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(DynamoDBError),
  #[display(...)]
  Attribute(DBItemError),
  #[display(...)]
  Transport(tonic::transport::Error),
  #[display(...)]
  Status(tonic::Status),
  #[display(...)]
  MissingItem,
  #[display(...)]
  DeviceList(DeviceListError),
  #[display(...)]
  MalformedItem,
  #[display(...)]
  Serde(serde_json::Error),
  #[display(...)]
  Reqwest(reqwest::Error),
  #[display(...)]
  BlobService(comm_lib::blob::client::BlobServiceError),
  #[display(...)]
  CannotOverwrite,
  #[display(...)]
  OneTimeKeyUploadLimitExceeded,
  #[display(...)]
  MaxRetriesExceeded,
  #[display(...)]
  IllegalState,
  #[display(...)]
  InvalidFormat,
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum DeviceListError {
  DeviceAlreadyExists,
  DeviceNotFound,
  ConcurrentUpdateError,
  InvalidDeviceListUpdate,
  InvalidSignature,
}

pub fn consume_error<T>(result: Result<T, Error>) {
  match result {
    Ok(_) => (),
    Err(e) => {
      error!("{}", e);
    }
  }
}

impl From<comm_lib::database::Error> for Error {
  fn from(value: comm_lib::database::Error) -> Self {
    use comm_lib::database::Error as E;
    match value {
      E::AwsSdk(err) => Self::AwsSdk(err),
      E::Attribute(err) => Self::Attribute(err),
      E::MaxRetriesExceeded => Self::MaxRetriesExceeded,
    }
  }
}
