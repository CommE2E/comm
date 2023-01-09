use aws_sdk_dynamodb::Error as DynamoDBError;
use proto::backup_service_server::BackupService;
use std::pin::Pin;
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, Stream, StreamExt};
use tonic::{Request, Response, Status};
use tracing::{debug, error, info, instrument, trace, warn, Instrument};

use crate::{
  constants::MPSC_CHANNEL_BUFFER_CAPACITY,
  database::{DatabaseClient, Error as DBError},
};

mod proto {
  tonic::include_proto!("backup");
}
pub use proto::backup_service_server::BackupServiceServer;

/// submodule containing gRPC endpoint handler implementations
mod handlers {
  pub(super) mod add_attachments;
  pub(super) mod create_backup;

  // re-exports for convenient usage in handlers
  pub(self) use super::handle_db_error;
  pub(self) use super::proto;
}
use self::handlers::create_backup::CreateBackupHandler;

pub struct MyBackupService {
  db: DatabaseClient,
}

impl MyBackupService {
  pub fn new(db_client: DatabaseClient) -> Self {
    MyBackupService { db: db_client }
  }
}

// gRPC implementation
#[tonic::async_trait]
impl BackupService for MyBackupService {
  type CreateNewBackupStream = Pin<
    Box<
      dyn Stream<Item = Result<proto::CreateNewBackupResponse, Status>> + Send,
    >,
  >;

  #[instrument(skip_all, fields(device_id, data_hash, backup_id, blob_holder))]
  async fn create_new_backup(
    &self,
    request: Request<tonic::Streaming<proto::CreateNewBackupRequest>>,
  ) -> Result<Response<Self::CreateNewBackupStream>, Status> {
    use proto::create_new_backup_request::Data::*;

    info!("CreateNewBackup request: {:?}", request);
    let mut in_stream = request.into_inner();
    let (tx, rx) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let db = self.db.clone();
    let worker = async move {
      let mut handler = CreateBackupHandler::new(&db);
      while let Some(message) = in_stream.next().await {
        let response = match message {
          Ok(proto::CreateNewBackupRequest {
            data: Some(UserId(user_id)),
          }) => handler.handle_user_id(user_id).await,
          Ok(proto::CreateNewBackupRequest {
            data: Some(DeviceId(device_id)),
          }) => handler.handle_device_id(device_id).await,
          Ok(proto::CreateNewBackupRequest {
            data: Some(KeyEntropy(key_entropy)),
          }) => handler.handle_key_entropy(key_entropy).await,
          Ok(proto::CreateNewBackupRequest {
            data: Some(NewCompactionHash(hash)),
          }) => handler.handle_data_hash(hash).await,
          Ok(proto::CreateNewBackupRequest {
            data: Some(NewCompactionChunk(chunk)),
          }) => handler.handle_data_chunk(chunk).await,
          unexpected => {
            error!("Received an unexpected request: {:?}", unexpected);
            Err(Status::unknown("unknown error"))
          }
        };

        trace!("Sending response: {:?}", response);
        if let Err(e) = tx.send(response).await {
          error!("Response was dropped: {}", e);
          break;
        }
        if handler.should_close_stream {
          trace!("Handler requested to close stream");
          break;
        }
      }
      if let Err(status) = handler.finish().await {
        trace!("Sending error response: {:?}", status);
        let _ = tx.send(Err(status)).await;
      }
      debug!("Request finished processing");
    };
    tokio::spawn(worker.in_current_span());

    let out_stream = ReceiverStream::new(rx);
    Ok(Response::new(
      Box::pin(out_stream) as Self::CreateNewBackupStream
    ))
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

  #[instrument(skip_all,
    fields(
      backup_id = &request.get_ref().backup_id,
      log_id = &request.get_ref().log_id)
    )]
  async fn add_attachments(
    &self,
    request: Request<proto::AddAttachmentsRequest>,
  ) -> Result<Response<()>, Status> {
    info!(
      "AddAttachment request. New holders: {}",
      &request.get_ref().holders
    );

    handlers::add_attachments::handle_add_attachments(
      &self.db,
      request.into_inner(),
    )
    .await?;

    info!("Request processed successfully");
    Ok(Response::new(()))
  }
}

/// A helper converting our Database errors into gRPC responses
fn handle_db_error(db_error: DBError) -> Status {
  match db_error {
    DBError::AwsSdk(DynamoDBError::InternalServerError(_))
    | DBError::AwsSdk(DynamoDBError::ProvisionedThroughputExceededException(
      _,
    ))
    | DBError::AwsSdk(DynamoDBError::RequestLimitExceeded(_)) => {
      warn!("AWS transient error occurred");
      Status::unavailable("please retry")
    }
    e => {
      error!("Encountered an unexpected error: {}", e);
      Status::failed_precondition("unexpected error")
    }
  }
}
