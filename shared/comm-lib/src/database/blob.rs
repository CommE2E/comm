use super::{AttributeExtractor, AttributeMap, DBItemError, TryFromAttribute};
use crate::blob::{
  client::{BlobServiceClient, BlobServiceError},
  types::BlobInfo,
};
use aws_sdk_dynamodb::{primitives::Blob, types::AttributeValue};
use bytes::Bytes;
use tokio_stream::StreamExt;

/// Represents array of bytes that could be either stored inline in
/// dynamodb or in blob, depending on the size.
#[derive(Clone, Debug)]
pub enum BlobOrDBContent {
  /// Shouldn't be created manually! First create [`BlobOrDBContent::Database`]
  /// either directly or using [`BlobOrDBContent::new`] and call
  /// [`BlobOrDBContent::move_to_blob`].
  Blob(BlobInfo),
  Database(Vec<u8>),
}

impl BlobOrDBContent {
  /// Creates a new [`BlobOrDBContent::Database`]
  pub fn new(bytes: Vec<u8>) -> Self {
    Self::Database(bytes)
  }

  /// Returns a tuple of attribute name and value for this content
  pub fn into_attr_pair(
    self,
    in_blob_attr: impl Into<String>,
    in_db_attr: impl Into<String>,
  ) -> (String, AttributeValue) {
    match self {
      Self::Blob(blob_info) => (in_blob_attr.into(), blob_info.into()),
      Self::Database(data) => {
        (in_db_attr.into(), AttributeValue::B(Blob::new(data)))
      }
    }
  }

  pub fn parse_from_attrs(
    attrs: &mut AttributeMap,
    in_blob_attr: impl Into<String>,
    in_db_attr: &str,
  ) -> Result<Self, DBItemError> {
    let in_blob_attr = in_blob_attr.into();
    if let Some(blob_info_attr) = attrs.remove(&in_blob_attr) {
      let blob_info =
        BlobInfo::try_from_attr(in_blob_attr, Some(blob_info_attr))?;
      return Ok(Self::Blob(blob_info));
    }

    let content_data = attrs.take_attr(in_db_attr.into())?;
    Ok(Self::Database(content_data))
  }

  /// Moves content to blob storage:
  /// - Switches `self` from [`BlobOrDBContent::Database`] to [`BlobOrDBContent::Blob`]
  /// - No-op for [`BlobOrDBContent::Blob`]
  pub async fn move_to_blob(
    &mut self,
    blob_client: &BlobServiceClient,
  ) -> Result<(), BlobServiceError> {
    let Self::Database(ref mut contents) = self else { return Ok(()); };
    let data = std::mem::take(contents);

    let new_blob_info = BlobInfo::from_bytes(&data);

    // NOTE: We send the data as a single chunk. This shouldn't be a problem
    // unless we start trying to send large byte payloads. In that case, we should
    // consider splitting the data into chunks and sending them as a stream.
    let data_stream = tokio_stream::once(Result::<_, std::io::Error>::Ok(data));

    blob_client
      .simple_put(&new_blob_info.blob_hash, &new_blob_info.holder, data_stream)
      .await?;

    *self = Self::Blob(new_blob_info);
    Ok(())
  }

  /// Fetches content bytes
  pub async fn fetch_bytes(
    self,
    blob_client: &BlobServiceClient,
  ) -> Result<Vec<u8>, BlobServiceError> {
    match self {
      Self::Database(data) => Ok(data),
      Self::Blob(BlobInfo { blob_hash, .. }) => {
        let stream = blob_client.get(&blob_hash).await?;
        let chunks: Vec<Bytes> = stream.collect::<Result<_, _>>().await?;
        let data = chunks.into_iter().flatten().collect();
        Ok(data)
      }
    }
  }
}
