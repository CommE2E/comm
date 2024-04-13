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
  CannotOverwrite,
  #[display(...)]
  OneTimeKeyUploadLimitExceeded,
  #[display(...)]
  MaxRetriesExceeded,
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum DeviceListError {
  DeviceAlreadyExists,
  DeviceNotFound,
  ConcurrentUpdateError,
  InvalidDeviceListUpdate,
}

pub fn consume_error<T>(result: Result<T, Error>) {
  match result {
    Ok(_) => (),
    Err(e) => {
      error!("{}", e);
    }
  }
}
