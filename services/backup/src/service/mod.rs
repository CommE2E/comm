use aws_sdk_dynamodb::Error as DynamoDBError;
use proto::backup_service_server::BackupService;
use rust_lib::database::Error as DBError;
use std::pin::Pin;
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, Stream, StreamExt};
use tonic::{Request, Response, Status};
use tracing::{debug, error, info, instrument, trace, warn};
use tracing_futures::Instrument;

use crate::{
  blob::BlobClient, constants::MPSC_CHANNEL_BUFFER_CAPACITY,
  database::DatabaseClient,
};

mod proto {
  tonic::include_proto!("backup");
}
pub use proto::backup_service_server::BackupServiceServer;

/// submodule containing gRPC endpoint handler implementations
mod handlers {
  pub(super) mod add_attachments;
  pub(super) mod create_backup;
  pub(super) mod pull_backup;
  pub(super) mod send_log;

  // re-exports for convenient usage in handlers
  pub(self) use super::handle_db_error;
  pub(self) use super::proto;
}
use self::handlers::create_backup::CreateBackupHandler;
use self::handlers::pull_backup::PullBackupHandler;
use self::handlers::send_log::SendLogHandler;

pub struct MyBackupService {
  db: DatabaseClient,
  blob_client: BlobClient,
}

impl MyBackupService {
  pub fn new(db_client: DatabaseClient, blob_client: BlobClient) -> Self {
    MyBackupService {
      db: db_client,
      blob_client,
    }
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

  #[instrument(skip_all, fields(device_id, backup_id, blob_holder))]
  async fn create_new_backup(
    &self,
    request: Request<tonic::Streaming<proto::CreateNewBackupRequest>>,
  ) -> Result<Response<Self::CreateNewBackupStream>, Status> {
    use proto::create_new_backup_request::Data::*;

    info!("CreateNewBackup request: {:?}", request);
    let mut in_stream = request.into_inner();
    let (tx, rx) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let db = self.db.clone();
    let blob_client = self.blob_client.clone();
    let worker = async move {
      let mut handler = CreateBackupHandler::new(db, blob_client);
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

  #[instrument(skip_all, fields(backup_id, log_id))]
  async fn send_log(
    &self,
    request: Request<tonic::Streaming<proto::SendLogRequest>>,
  ) -> Result<Response<proto::SendLogResponse>, Status> {
    use proto::send_log_request::Data::*;

    info!("SendLog request: {:?}", request);
    let mut handler = SendLogHandler::new(&self.db, &self.blob_client);

    let mut in_stream = request.into_inner();
    while let Some(message) = in_stream.next().await {
      let result = match message {
        Ok(proto::SendLogRequest {
          data: Some(UserId(user_id)),
        }) => handler.handle_user_id(user_id).await,
        Ok(proto::SendLogRequest {
          data: Some(BackupId(backup_id)),
        }) => handler.handle_backup_id(backup_id).await,
        Ok(proto::SendLogRequest {
          data: Some(LogHash(log_hash)),
        }) => handler.handle_log_hash(log_hash).await,
        Ok(proto::SendLogRequest {
          data: Some(LogData(chunk)),
        }) => handler.handle_log_data(chunk).await,
        unexpected => {
          error!("Received an unexpected request: {:?}", unexpected);
          Err(Status::unknown("unknown error"))
        }
      };

      if let Err(err) = result {
        error!("An error occurred when processing request: {:?}", err);
        return Err(err);
      }
      if handler.should_close_stream {
        trace!("Handler requested to close request stream");
        break;
      }
    }

    let response = handler.finish().await;
    debug!("Finished. Sending response: {:?}", response);
    response.map(|response_body| Response::new(response_body))
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

  #[instrument(skip_all, fields(backup_id = &request.get_ref().backup_id))]
  async fn pull_backup(
    &self,
    request: Request<proto::PullBackupRequest>,
  ) -> Result<Response<Self::PullBackupStream>, Status> {
    info!("PullBackup request: {:?}", request);

    let handler =
      PullBackupHandler::new(&self.db, &self.blob_client, request.into_inner())
        .await?;

    let stream = handler.into_response_stream().in_current_span();
    Ok(Response::new(Box::pin(stream) as Self::PullBackupStream))
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
      &self.blob_client,
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
