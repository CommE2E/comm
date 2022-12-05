use proto::backup_service_server::BackupService;
use std::pin::Pin;
use tokio_stream::Stream;
use tonic::{Request, Response, Status};
use tracing::instrument;

mod proto {
  tonic::include_proto!("backup");
}
pub use proto::backup_service_server::BackupServiceServer;

#[derive(Default)]
pub struct MyBackupService {}

// gRPC implementation
#[tonic::async_trait]
impl BackupService for MyBackupService {
  type CreateNewBackupStream = Pin<
    Box<
      dyn Stream<Item = Result<proto::CreateNewBackupResponse, Status>> + Send,
    >,
  >;

  #[instrument(skip(self))]
  async fn create_new_backup(
    &self,
    _request: Request<tonic::Streaming<proto::CreateNewBackupRequest>>,
  ) -> Result<Response<Self::CreateNewBackupStream>, Status> {
    Err(Status::unimplemented("unimplemented"))
  }

  #[instrument(skip(self))]
  async fn send_log(
    &self,
    _request: Request<tonic::Streaming<proto::SendLogRequest>>,
  ) -> Result<Response<proto::SendLogResponse>, Status> {
    Err(Status::unimplemented("unimplemented"))
  }

  type RecoverBackupKeyStream = Pin<
    Box<
      dyn Stream<Item = Result<proto::RecoverBackupKeyResponse, Status>> + Send,
    >,
  >;

  #[instrument(skip(self))]
  async fn recover_backup_key(
    &self,
    _request: Request<tonic::Streaming<proto::RecoverBackupKeyRequest>>,
  ) -> Result<Response<Self::RecoverBackupKeyStream>, Status> {
    Err(Status::unimplemented("unimplemented"))
  }

  type PullBackupStream = Pin<
    Box<dyn Stream<Item = Result<proto::PullBackupResponse, Status>> + Send>,
  >;

  #[instrument(skip(self))]
  async fn pull_backup(
    &self,
    _request: Request<proto::PullBackupRequest>,
  ) -> Result<Response<Self::PullBackupStream>, Status> {
    Err(Status::unimplemented("unimplemented"))
  }

  #[instrument(skip(self))]
  async fn add_attachments(
    &self,
    _request: Request<proto::AddAttachmentsRequest>,
  ) -> Result<Response<()>, Status> {
    Err(Status::unimplemented("unimplemented"))
  }
}
