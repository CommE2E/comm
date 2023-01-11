use tokio_stream::Stream;
use tonic::Status;

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
    unimplemented!()
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
    // the unimplemented!() macro doesnt compile here
    async_stream::stream! {
      yield Err(Status::unimplemented("not implemented yet"))
    }
  }
}
