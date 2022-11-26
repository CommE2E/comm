use anyhow::Result;
use blob::blob_service_server::BlobService;
use std::pin::Pin;
use tokio_stream::Stream;
use tonic::{Request, Response, Status};

pub mod blob {
  tonic::include_proto!("blob");
}

#[derive(Default)]
pub struct MyBlobService {}

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
