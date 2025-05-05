use aws_sdk_s3::{
  operation::create_multipart_upload::CreateMultipartUploadOutput,
  primitives::ByteStream,
  types::{CompletedMultipartUpload, CompletedPart, Delete, ObjectIdentifier},
  Error as S3Error,
};
use std::ops::{Bound, RangeBounds};
use tracing::{debug, error, trace};

use crate::constants::error_types;

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(Box<S3Error>),
  #[display(...)]
  ByteStream(std::io::Error),
  #[display(...)]
  InvalidPath(S3PathError),
  #[display(fmt = "There are no parts to upload")]
  EmptyUpload,
  #[display(fmt = "Missing upload ID")]
  MissingUploadID,
  #[display(fmt = "Missing or invalid S3 object attribute: {}", "_0")]
  #[error(ignore)]
  InvalidAttribute(&'static str),
}

#[derive(Debug, derive_more::Error)]
pub enum S3PathError {
  MissingSeparator(#[error(ignore)] String),
  MissingBucketName(#[error(ignore)] String),
  MissingObjectName(#[error(ignore)] String),
}

impl std::fmt::Display for S3PathError {
  fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
    match self {
      S3PathError::MissingSeparator(path) => {
        write!(f, "S3 path: [{}] should contain the '/' separator", path)
      }
      S3PathError::MissingBucketName(path) => {
        write!(f, "Expected bucket name in S3 path: [{}]", path)
      }
      S3PathError::MissingObjectName(path) => {
        write!(f, "Expected object name in S3 path: [{}]", path)
      }
    }
  }
}

type S3Result<T> = Result<T, Error>;

/// A helper structure representing an S3 object path
#[derive(Clone, Debug)]
pub struct S3Path {
  pub bucket_name: String,
  pub object_name: String,
}

impl S3Path {
  /// Constructs an [`S3Path`] from given string
  /// The path should be in the following format: `[bucket_name]/[object_name]`
  pub fn from_full_path(full_path: &str) -> Result<Self, S3PathError> {
    if !full_path.contains('/') {
      return Err(S3PathError::MissingSeparator(full_path.to_string()));
    }

    let mut split = full_path.split('/');
    Ok(S3Path {
      bucket_name: split
        .next()
        .ok_or_else(|| S3PathError::MissingBucketName(full_path.to_string()))?
        .to_string(),
      object_name: split
        .next()
        .ok_or_else(|| S3PathError::MissingObjectName(full_path.to_string()))?
        .to_string(),
    })
  }

  /// Retrieves full S3 path string in the following format: `[bucket_name]/[object_name]`
  pub fn to_full_path(&self) -> String {
    format!("{}/{}", self.bucket_name, self.object_name)
  }
}

impl From<&S3Path> for String {
  fn from(s3_path: &S3Path) -> Self {
    s3_path.to_full_path()
  }
}

impl TryFrom<&str> for S3Path {
  type Error = S3PathError;
  fn try_from(full_path: &str) -> Result<Self, Self::Error> {
    Self::from_full_path(full_path)
  }
}

#[derive(Clone)]
pub struct S3Client {
  client: aws_sdk_s3::Client,
}

impl S3Client {
  pub fn new(aws_config: &aws_config::SdkConfig) -> Self {
    let s3_config = aws_sdk_s3::config::Builder::from(aws_config)
      // localstack doesn't support virtual addressing
      .force_path_style(crate::config::CONFIG.localstack_endpoint.is_some())
      .build();
    S3Client {
      client: aws_sdk_s3::Client::from_conf(s3_config),
    }
  }

  /// Creates a new [`MultiPartUploadSession`]
  pub async fn start_upload_session(
    &self,
    s3_path: &S3Path,
  ) -> S3Result<MultiPartUploadSession> {
    MultiPartUploadSession::start(&self.client, s3_path).await
  }

  /// Returns object metadata (e.g. file size) without downloading the object itself
  pub async fn get_object_metadata(
    &self,
    s3_path: &S3Path,
  ) -> S3Result<aws_sdk_s3::operation::head_object::HeadObjectOutput> {
    let response = self
      .client
      .head_object()
      .bucket(s3_path.bucket_name.clone())
      .key(s3_path.object_name.clone())
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::S3_ERROR,
          "S3 failed to get object metadata"
        );
        Error::AwsSdk(Box::new(e.into()))
      })?;

    Ok(response)
  }

  pub async fn get_object_size(&self, s3_path: &S3Path) -> S3Result<u64> {
    trace!("Getting S3 object metadata...");
    let object_metadata = self.get_object_metadata(&s3_path).await?;
    let blob_size = object_metadata
      .content_length()
      .ok_or_else(|| {
        error!(
          errorType = error_types::S3_ERROR,
          "Failed to get S3 object content length"
        );
        Error::InvalidAttribute("content_length")
      })
      .and_then(|len| {
        if len >= 0 {
          Ok(len as u64)
        } else {
          error!(
            errorType = error_types::S3_ERROR,
            "S3 object content length is negative"
          );
          Err(Error::InvalidAttribute("content_length"))
        }
      })?;

    Ok(blob_size)
  }

  /// Downloads object and retrieves data bytes within provided range
  ///
  /// * `range` - Range of object bytes to download.
  pub async fn get_object_bytes(
    &self,
    s3_path: &S3Path,
    range: impl RangeBounds<u64>,
  ) -> S3Result<Vec<u8>> {
    let mut request = self
      .client
      .get_object()
      .bucket(&s3_path.bucket_name)
      .key(&s3_path.object_name);

    if range.start_bound() != Bound::Unbounded
      || range.end_bound() != Bound::Unbounded
    {
      // Create a valid HTTP Range header
      let from = match range.start_bound() {
        Bound::Included(start) => start.to_string(),
        _ => "0".to_string(),
      };
      let to = match range.end_bound() {
        Bound::Included(end) => end.to_string(),
        Bound::Excluded(end) => (end - 1).to_string(),
        _ => "".to_string(),
      };
      let range = format!("bytes={}-{}", from, to);
      request = request.range(range);
    }

    let response = request.send().await.map_err(|e| {
      error!(errorType = error_types::S3_ERROR, "S3 failed to get object");
      Error::AwsSdk(Box::new(e.into()))
    })?;
    let data = response.body.collect().await.map_err(|e| {
      error!(
        errorType = error_types::S3_ERROR,
        "S3 failed to stream object bytes"
      );
      Error::ByteStream(e.into())
    })?;
    Ok(data.to_vec())
  }

  /// Deletes object at provided path
  pub async fn delete_object(&self, s3_path: &S3Path) -> S3Result<()> {
    self
      .client
      .delete_object()
      .bucket(&s3_path.bucket_name)
      .key(&s3_path.object_name)
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::S3_ERROR,
          "S3 failed to delete object"
        );
        Error::AwsSdk(Box::new(e.into()))
      })?;

    Ok(())
  }

  pub async fn batch_delete_objects(&self, paths: Vec<S3Path>) -> S3Result<()> {
    let Some(first_path) = paths.first() else {
      debug!("No S3 objects to delete");
      return Ok(());
    };

    let bucket_name = &first_path.bucket_name;
    let objects = paths
      .iter()
      .map(|path| {
        ObjectIdentifier::builder()
          .key(&path.object_name)
          .build()
          .expect("key not set in ObjectIdentifier builder")
      })
      .collect();

    self
      .client
      .delete_objects()
      .bucket(bucket_name)
      .delete(
        Delete::builder()
          .set_objects(Some(objects))
          .build()
          .expect("Objects not set in Delete builder"),
      )
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::S3_ERROR,
          "S3 failed to batch delete objects"
        );
        Error::AwsSdk(Box::new(e.into()))
      })?;

    Ok(())
  }
}

/// Represents a multipart upload session to the AWS S3
pub struct MultiPartUploadSession {
  client: aws_sdk_s3::Client,
  bucket_name: String,
  object_name: String,
  upload_id: String,
  upload_parts: Vec<CompletedPart>,
  blob_size: u64,
}

impl MultiPartUploadSession {
  /// Starts a new upload session and returns its instance
  /// Don't call this directly, use [`S3Client::start_upload_session()`] instead
  async fn start(
    client: &aws_sdk_s3::Client,
    s3_path: &S3Path,
  ) -> S3Result<Self> {
    let multipart_upload_res: CreateMultipartUploadOutput = client
      .create_multipart_upload()
      .bucket(&s3_path.bucket_name)
      .key(&s3_path.object_name)
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::S3_ERROR,
          "S3 failed to start upload session"
        );
        Error::AwsSdk(Box::new(e.into()))
      })?;

    let upload_id = multipart_upload_res.upload_id().ok_or_else(|| {
      error!(
        errorType = error_types::S3_ERROR,
        "Upload ID expected to be present"
      );
      Error::MissingUploadID
    })?;
    debug!("Started multipart upload session with ID: {}", upload_id);

    Ok(MultiPartUploadSession {
      client: client.clone(),
      bucket_name: String::from(&s3_path.bucket_name),
      object_name: String::from(&s3_path.object_name),
      upload_id: String::from(upload_id),
      upload_parts: Vec::new(),
      blob_size: 0,
    })
  }

  /// adds data part to the multipart upload
  pub async fn add_part(&mut self, part: Vec<u8>) -> S3Result<()> {
    let part_size = part.len() as u64;
    let stream = ByteStream::from(part);
    let part_number: i32 = self.upload_parts.len() as i32 + 1;
    let upload_result = self
      .client
      .upload_part()
      .key(&self.object_name)
      .bucket(&self.bucket_name)
      .upload_id(&self.upload_id)
      .part_number(part_number)
      .body(stream)
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::S3_ERROR,
          "Failed to add upload part"
        );
        Error::AwsSdk(Box::new(e.into()))
      })?;

    let completed_part = CompletedPart::builder()
      .e_tag(upload_result.e_tag.unwrap_or_default())
      .part_number(part_number)
      .build();
    trace!(
      upload_id = self.upload_id,
      e_tag = completed_part.e_tag.as_deref().unwrap_or("N/A"),
      "Uploaded part {}.",
      part_number
    );
    self.blob_size += part_size;
    self.upload_parts.push(completed_part);
    Ok(())
  }

  /// finishes the upload, returns uploaded blob size
  pub async fn finish_upload(&self) -> S3Result<u64> {
    if self.upload_parts.is_empty() {
      return Err(Error::EmptyUpload);
    }

    let completed_multipart_upload = CompletedMultipartUpload::builder()
      .set_parts(Some(self.upload_parts.clone()))
      .build();

    self
      .client
      .complete_multipart_upload()
      .bucket(&self.bucket_name)
      .key(&self.object_name)
      .multipart_upload(completed_multipart_upload)
      .upload_id(&self.upload_id)
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::S3_ERROR,
          "Failed to finish upload session"
        );
        Error::AwsSdk(Box::new(e.into()))
      })?;

    debug!(
      blob_size = self.blob_size,
      upload_id = self.upload_id,
      "Multipart upload complete"
    );
    Ok(self.blob_size)
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_s3path_from_full_path() {
    let full_path = "my_bucket/some_object";
    let s3_path = S3Path::from_full_path(full_path);
    assert!(s3_path.is_ok());
    let s3_path = s3_path.unwrap();
    assert_eq!(&s3_path.bucket_name, "my_bucket");
    assert_eq!(&s3_path.object_name, "some_object");
  }

  #[test]
  fn test_s3path_from_invalid_path() {
    let result = S3Path::from_full_path("invalid_path");
    assert!(result.is_err())
  }

  #[test]
  fn test_s3path_to_full_path() {
    let s3_path = S3Path {
      bucket_name: "my_bucket".to_string(),
      object_name: "some_object".to_string(),
    };
    let full_path = s3_path.to_full_path();
    assert_eq!(full_path, "my_bucket/some_object");
  }
}
