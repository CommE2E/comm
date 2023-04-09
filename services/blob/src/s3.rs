use anyhow::{anyhow, Result};
use aws_sdk_s3::{
  model::{CompletedMultipartUpload, CompletedPart},
  output::CreateMultipartUploadOutput,
  types::ByteStream,
};
use std::{
  ops::{Bound, RangeBounds},
  sync::Arc,
};

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
      return Err(anyhow!(
        "S3 path [{}] should contain the '/' separator",
        full_path
      ));
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

#[derive(Clone)]
pub struct S3Client {
  client: Arc<aws_sdk_s3::Client>,
}

impl S3Client {
  pub fn new(aws_config: &aws_types::SdkConfig) -> Self {
    let s3_config = aws_sdk_s3::config::Builder::from(aws_config)
      // localstack doesn't support virtual addressing
      .force_path_style(crate::config::CONFIG.is_sandbox)
      .build();
    S3Client {
      client: Arc::new(aws_sdk_s3::Client::from_conf(s3_config)),
    }
  }

  /// Creates a new [`MultiPartUploadSession`]
  pub async fn start_upload_session(
    &self,
    s3_path: &S3Path,
  ) -> Result<MultiPartUploadSession> {
    MultiPartUploadSession::start(&self.client, s3_path).await
  }

  /// Returns object metadata (e.g. file size) without downloading the object itself
  pub async fn get_object_metadata(
    &self,
    s3_path: &S3Path,
  ) -> Result<aws_sdk_s3::output::HeadObjectOutput> {
    let response = self
      .client
      .head_object()
      .bucket(s3_path.bucket_name.clone())
      .key(s3_path.object_name.clone())
      .send()
      .await?;

    Ok(response)
  }

  /// Downloads object and retrieves data bytes within provided range
  ///
  /// * `range` - Range of object bytes to download.
  pub async fn get_object_bytes(
    &self,
    s3_path: &S3Path,
    range: impl RangeBounds<u64>,
  ) -> Result<Vec<u8>> {
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

    let response = request.send().await?;
    let data = response.body.collect().await?;
    Ok(data.to_vec())
  }

  /// Deletes object at provided path
  pub async fn delete_object(&self, s3_path: &S3Path) -> Result<()> {
    self
      .client
      .delete_object()
      .bucket(&s3_path.bucket_name)
      .key(&s3_path.object_name)
      .send()
      .await?;

    Ok(())
  }
}

/// Represents a multipart upload session to the AWS S3
pub struct MultiPartUploadSession {
  client: Arc<aws_sdk_s3::Client>,
  bucket_name: String,
  object_name: String,
  upload_id: String,
  upload_parts: Vec<CompletedPart>,
}

impl MultiPartUploadSession {
  /// Starts a new upload session and returns its instance
  /// Don't call this directly, use [`S3Client::start_upload_session()`] instead
  async fn start(
    client: &Arc<aws_sdk_s3::Client>,
    s3_path: &S3Path,
  ) -> Result<Self> {
    let multipart_upload_res: CreateMultipartUploadOutput = client
      .create_multipart_upload()
      .bucket(&s3_path.bucket_name)
      .key(&s3_path.object_name)
      .send()
      .await?;

    let upload_id = multipart_upload_res
      .upload_id()
      .ok_or(anyhow!("Upload ID expected to be present"))?;

    Ok(MultiPartUploadSession {
      client: client.clone(),
      bucket_name: String::from(&s3_path.bucket_name),
      object_name: String::from(&s3_path.object_name),
      upload_id: String::from(upload_id),
      upload_parts: Vec::new(),
    })
  }

  /// adds data part to the multipart upload
  pub async fn add_part(&mut self, part: Vec<u8>) -> Result<()> {
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
      .await?;

    let completed_part = CompletedPart::builder()
      .e_tag(upload_result.e_tag.unwrap_or_default())
      .part_number(part_number)
      .build();
    self.upload_parts.push(completed_part);
    Ok(())
  }

  /// finishes the upload
  pub async fn finish_upload(&self) -> Result<()> {
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
      .await?;

    Ok(())
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
