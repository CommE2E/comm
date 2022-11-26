use anyhow::{Context, Result};
use blob::blob_service_server::BlobService;
use std::{pin::Pin, sync::Arc};
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, Stream};
use tonic::{Request, Response, Status};

use crate::{
  constants::{
    GRPC_CHUNK_SIZE_LIMIT, GRPC_METADATA_SIZE_PER_MESSAGE,
    MPSC_CHANNEL_BUFFER_CAPACITY,
  },
  database::{BlobItem, DatabaseClient, ReverseIndexItem},
  s3::S3Path,
};

pub mod blob {
  tonic::include_proto!("blob");
}

pub struct MyBlobService {
  db: DatabaseClient,
  s3: Arc<aws_sdk_s3::Client>,
}

impl MyBlobService {
  pub fn new(db_client: DatabaseClient, s3_client: aws_sdk_s3::Client) -> Self {
    MyBlobService {
      db: db_client,
      s3: Arc::new(s3_client),
    }
  }

  async fn find_s3_path_by_reverse_index(
    &self,
    reverse_index_item: &ReverseIndexItem,
  ) -> Result<S3Path, Status> {
    let blob_hash = &reverse_index_item.blob_hash;
    match self.db.find_blob_item(&blob_hash).await {
      Ok(Some(BlobItem { s3_path, .. })) => Ok(s3_path),
      Ok(None) => Err(Status::not_found("blob not found")),
      Err(_) => Err(Status::aborted("internal error")),
    }
  }

  async fn find_s3_path_by_holder(
    &self,
    holder: &str,
  ) -> Result<S3Path, Status> {
    match self.db.find_reverse_index_by_holder(holder).await {
      Ok(Some(reverse_index)) => {
        self.find_s3_path_by_reverse_index(&reverse_index).await
      }
      Ok(None) => Err(Status::not_found("blob not found")),
      Err(_) => Err(Status::aborted("internal error")),
    }
  }
}

// gRPC implementation
#[tonic::async_trait]
impl BlobService for MyBlobService {
  type PutStream =
    Pin<Box<dyn Stream<Item = Result<blob::PutResponse, Status>> + Send>>;
  async fn put(
    &self,
    _request: Request<tonic::Streaming<blob::PutRequest>>,
  ) -> Result<Response<Self::PutStream>, Status> {
    Err(Status::unimplemented("Not implemented yet"))
  }

  type GetStream =
    Pin<Box<dyn Stream<Item = Result<blob::GetResponse, Status>> + Send>>;
  async fn get(
    &self,
    request: Request<blob::GetRequest>,
  ) -> Result<Response<Self::GetStream>, Status> {
    let message: blob::GetRequest = request.into_inner();
    let s3_path = self.find_s3_path_by_holder(&message.holder).await?;

    let object_metadata = self
      .s3
      .head_object()
      .bucket(s3_path.bucket_name.clone())
      .key(s3_path.object_name.clone())
      .send()
      .await
      .map_err(|_| Status::aborted("server error"))?;

    let file_size: u64 = object_metadata.content_length().unsigned_abs();
    let chunk_size: u64 =
      GRPC_CHUNK_SIZE_LIMIT - GRPC_METADATA_SIZE_PER_MESSAGE;

    let (tx, rx) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let s3 = self.s3.clone();

    tokio::spawn(async move {
      let mut offset: u64 = 0;
      while offset < file_size {
        let next_size = std::cmp::min(chunk_size, file_size - offset);
        let range = format!("bytes={}-{}", offset, offset + next_size - 1);

        let data = match s3
          .get_object()
          .bucket(&s3_path.bucket_name)
          .key(&s3_path.object_name)
          .range(range)
          .send()
          .await
          .context("Failed to retrieve object data")
        {
          Ok(part) => {
            part.body.collect().await.context("Failed to collect bytes")
          }
          Err(e) => Err(e),
        };

        let response = match data {
          Ok(data) => Ok(blob::GetResponse {
            data_chunk: data.into_bytes().to_vec(),
          }),
          Err(_) => Err(Status::aborted("download failed")),
        };

        let should_abort = response.is_err();
        if let Err(e) = tx.send(response).await {
          println!("Response was dropped: {}", e);
          break;
        }
        if should_abort {
          break;
        }

        offset += chunk_size;
      }
    });

    let out_stream = ReceiverStream::new(rx);
    Ok(Response::new(Box::pin(out_stream) as Self::GetStream))
  }

  async fn remove(
    &self,
    _request: Request<blob::RemoveRequest>,
  ) -> Result<Response<()>, Status> {
    Err(Status::unimplemented("Not implemented yet"))
  }
}
