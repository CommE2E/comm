use async_stream::try_stream;
use tokio_stream::{Stream, StreamExt};
use tonic::Status;
use tracing::{debug, trace};

use super::handle_db_error;
use super::proto::{self, PullBackupResponse};
use crate::database::{BackupItem, DatabaseClient, LogItem};

pub struct PullBackupHandler {
  backup_item: BackupItem,
  logs: Vec<LogItem>,
}

impl PullBackupHandler {
  pub async fn new(
    db: &DatabaseClient,
    request: proto::PullBackupRequest,
  ) -> Result<Self, Status> {
    let proto::PullBackupRequest { user_id, backup_id } = request;
    let backup_item = db
      .find_backup_item(&user_id, &backup_id)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| {
        debug!("Backup item not found");
        Status::not_found("Backup item not found")
      })?;

    let backup_id = backup_item.backup_id.as_str();
    let logs = db
      .find_log_items_for_backup(backup_id)
      .await
      .map_err(handle_db_error)?;

    Ok(PullBackupHandler { backup_item, logs })
  }

  /// Consumes the handler and provides a response `Stream`. The stream will
  /// produce the following in order:
  /// - Backup compaction data chunks
  /// - Backup logs
  ///   - Whole log, if stored in db
  ///   - Log chunks, if stored in blob
  pub fn into_response_stream(
    self,
  ) -> impl Stream<Item = Result<PullBackupResponse, Status>> {
    use proto::pull_backup_response::*;

    try_stream! {
      debug!("Pulling backup...");
      {
        let compaction_stream = backup_compaction_stream(&self.backup_item);
        tokio::pin!(compaction_stream);
        while let Some(response) = compaction_stream.try_next().await? {
          yield response;
        }
      }
      trace!("Backup data pull complete.");

      if self.logs.is_empty() {
        debug!("No logs to pull. Finishing");
        return;
      }

      debug!("Pulling logs...");
      for log in self.logs {
        trace!("Pulling log ID={}", &log.log_id);

        if log.persisted_in_blob {
          trace!("Log persisted in blob");
          let log_data_stream = log_stream(&log);
          tokio::pin!(log_data_stream);
          while let Some(response) = log_data_stream.try_next().await? {
            yield response;
          }
        } else {
          yield proto::PullBackupResponse {
            attachment_holders: Some(log.attachment_holders),
            id: Some(Id::LogId(log.log_id)),
            data: Some(Data::LogChunk(log.value.into_bytes())),
          };
        }
      }
      trace!("Pulled all logs, done");
    }
  }
}

fn backup_compaction_stream(
  backup_item: &BackupItem,
) -> impl Stream<Item = Result<proto::PullBackupResponse, Status>> + '_ {
  async_stream::stream! {
    yield Err(Status::unimplemented("Not implemented yet"));
  }
}

fn log_stream(
  log: &LogItem,
) -> impl Stream<Item = Result<proto::PullBackupResponse, Status>> + '_ {
  async_stream::stream! {
    yield Err(Status::unimplemented("Not implemented yet"));
  }
}
