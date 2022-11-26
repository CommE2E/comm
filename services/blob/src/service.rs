use anyhow::Result;
use blob::blob_service_server::BlobService;
use std::{pin::Pin, sync::Arc};
use tokio_stream::Stream;
use tonic::{Request, Response, Status};

use crate::database::DatabaseClient;

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
    _request: Request<blob::GetRequest>,
  ) -> Result<Response<Self::GetStream>, Status> {
    Err(Status::unimplemented("Not implemented yet"))
  }

  async fn remove(
    &self,
    _request: Request<blob::RemoveRequest>,
  ) -> Result<Response<()>, Status> {
    Err(Status::unimplemented("Not implemented yet"))
  }
}
