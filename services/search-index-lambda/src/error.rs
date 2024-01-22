#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(fmt = "Payload Error: {:?}", _0)]
  PayloadError(RecordError),
  #[display(fmt = "Missing OPENSEARCH_ENDPOINT: {:?}", _0)]
  MissingOpenSearchEndpoint(std::env::VarError),
  #[display(fmt = "Serialization Error: {:?}", _0)]
  SerializationError(serde_json::Error),
  #[display(fmt = "Tracing Error {:?}", _0)]
  TracingError(tracing::subscriber::SetGlobalDefaultError),
  #[display(fmt = "Reqwest Error {:?}", _0)]
  ReqwestError(reqwest::Error),
  #[display(fmt = "Update Index Error: Status Code: {:?}", _0)]
  UpdateIndexError(#[error(ignore)] reqwest::StatusCode),
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum RecordError {
  InvalidAttributeType,
  MissingEventName,
  MissingDynamoDBStreamRecord,
  MissingNewImage,
  MissingOldImage,
  MissingUserId,
  MissingUsername,
}
