use anyhow::{anyhow, Result};
use aws_sdk_s3::model::CompletedPart;
use aws_sdk_s3::Client as S3Client;
use std::sync::Arc;

/// A helper structure representing an S3 object path
#[derive(Clone, Debug)]
pub struct S3Path {
  pub bucket_name: String,
  pub object_name: String,
}

impl S3Path {
  /// Constructs an [`S3Path`] from given string
  /// The path should be in the following format: `[bucket_name]/[object_name]`
  pub fn from_full_path(full_path: &str) -> Result<Self> {
    if !full_path.contains('/') {
      return Err(anyhow!("S3 path should contain the '/' separator"));
    }

    let mut split = full_path.split('/');
    Ok(S3Path {
      bucket_name: split
        .next()
        .ok_or(anyhow!("Expected bucket name in path [{}]", full_path))?
        .to_string(),
      object_name: split
        .next()
        .ok_or(anyhow!("Expected object name in path [{}]", full_path))?
        .to_string(),
    })
  }

  /// Retrieves full S3 path string in the following format: `[bucket_name]/[object_name]`
  pub fn to_full_path(&self) -> String {
    format!("{}/{}", self.bucket_name, self.object_name)
  }
}

/// Represents a multipart upload session to the AWS S3
pub struct MultiPartUploadSession {
  client: Arc<S3Client>,
  bucket_name: String,
  object_name: String,
  upload_id: String,
  upload_parts: Vec<CompletedPart>,
}

impl MultiPartUploadSession {
  /// Starts a new upload session and returns its instance
  pub async fn start(client: &Arc<S3Client>, s3_path: &S3Path) -> Result<Self> {
    unimplemented!()
  }

  /// adds data part to the multipart upload
  pub async fn add_part(&mut self, part: Vec<u8>) -> Result<()> {
    unimplemented!()
  }

  /// finishes the upload
  pub async fn finish_upload(&self) -> Result<()> {
    unimplemented!()
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
