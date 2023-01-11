use async_stream::try_stream;
use tokio_stream::{Stream, StreamExt};
use tonic::Status;
use tracing::{debug, trace, warn};

use super::handle_db_error;
use super::proto::{self, PullBackupResponse};
use crate::{
  constants::{
    BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS, BACKUP_TABLE_FIELD_BACKUP_ID,
    GRPC_CHUNK_SIZE_LIMIT, GRPC_METADATA_SIZE_PER_MESSAGE,
    LOG_TABLE_FIELD_ATTACHMENT_HOLDERS, LOG_TABLE_FIELD_LOG_ID,
  },
  database::{BackupItem, DatabaseClient, LogItem},
};

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

/// Represents downloadable item stored in Blob service
trait BlobStoredItem {
  // Blob holder representing this item
  fn get_holder(&self) -> &str;

  /// Generates a gRPC response for given `data_chunk`.
  /// The response may be in extended version, with `include_extra_info`,
  /// ususally sent with first chunk
  fn to_response(
    &self,
    data_chunk: Vec<u8>,
    include_extra_info: bool,
  ) -> proto::PullBackupResponse;

  /// Size in bytes of non-data fields contained in response message.
  fn metadata_size(&self, include_extra_info: bool) -> usize;
}

impl BlobStoredItem for BackupItem {
  fn get_holder(&self) -> &str {
    &self.compaction_holder
  }

  fn to_response(
    &self,
    data_chunk: Vec<u8>,
    include_extra_info: bool,
  ) -> proto::PullBackupResponse {
    use proto::pull_backup_response::*;
    let attachment_holders = if include_extra_info {
      Some(self.attachment_holders.clone())
    } else {
      None
    };
    proto::PullBackupResponse {
      id: Some(Id::BackupId(self.backup_id.clone())),
      data: Some(Data::CompactionChunk(data_chunk)),
      attachment_holders,
    }
  }

  fn metadata_size(&self, include_extra_info: bool) -> usize {
    let mut extra_bytes: usize = 0;
    extra_bytes += BACKUP_TABLE_FIELD_BACKUP_ID.as_bytes().len();
    extra_bytes += self.backup_id.as_bytes().len();
    if include_extra_info {
      extra_bytes += BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS.as_bytes().len();
      extra_bytes += self.attachment_holders.as_bytes().len();
    }
    extra_bytes
  }
}

impl BlobStoredItem for LogItem {
  fn get_holder(&self) -> &str {
    &self.value
  }

  fn to_response(
    &self,
    data_chunk: Vec<u8>,
    include_extra_info: bool,
  ) -> proto::PullBackupResponse {
    use proto::pull_backup_response::*;
    let attachment_holders = if include_extra_info {
      Some(self.attachment_holders.clone())
    } else {
      None
    };
    proto::PullBackupResponse {
      id: Some(Id::LogId(self.log_id.clone())),
      data: Some(Data::LogChunk(data_chunk)),
      attachment_holders,
    }
  }

  fn metadata_size(&self, include_extra_info: bool) -> usize {
    let mut extra_bytes: usize = 0;
    extra_bytes += LOG_TABLE_FIELD_LOG_ID.as_bytes().len();
    extra_bytes += self.log_id.as_bytes().len();
    if include_extra_info {
      extra_bytes += LOG_TABLE_FIELD_ATTACHMENT_HOLDERS.as_bytes().len();
      extra_bytes += self.attachment_holders.as_bytes().len();
    }
    extra_bytes
  }
}

/// A utility structure that buffers downloaded data and allows to retrieve it
/// as chunks of arbitrary size, not greater than provided `limit`.
struct ResponseBuffer {
  buf: Vec<u8>,
  limit: usize,
}

impl Default for ResponseBuffer {
  /// Buffer size defaults to max usable gRPC message size
  fn default() -> Self {
    ResponseBuffer::new(GRPC_CHUNK_SIZE_LIMIT - GRPC_METADATA_SIZE_PER_MESSAGE)
  }
}

impl ResponseBuffer {
  pub fn new(limit: usize) -> Self {
    ResponseBuffer {
      buf: Vec::new(),
      limit,
    }
  }

  pub fn put(&mut self, data: Vec<u8>) {
    if data.len() > self.limit {
      warn!("Data saved to buffer is larger than chunk limit.");
    }

    self.buf.extend(data);
  }

  /// Gets chunk of size `limit - padding` and leaves remainder in buffer
  pub fn get_chunk(&mut self, padding: usize) -> Vec<u8> {
    let mut chunk = std::mem::take(&mut self.buf);

    let target_size = self.limit - padding;
    if chunk.len() > target_size {
      // after this operation, chunk=0..target_size, self.buf=target_size..end
      self.buf = chunk.split_off(target_size);
    }
    return chunk;
  }

  /// Does buffer length exceed given limit
  pub fn is_saturated(&self) -> bool {
    self.buf.len() >= self.limit
  }

  pub fn is_empty(&self) -> bool {
    self.buf.is_empty()
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  const LIMIT: usize = 100;

  #[test]
  fn test_response_buffer() {
    let mut buffer = ResponseBuffer::new(LIMIT);
    assert_eq!(buffer.is_empty(), true);

    // put 80 bytes of data
    buffer.put(vec![0u8; 80]);
    assert_eq!(buffer.is_empty(), false);
    assert_eq!(buffer.is_saturated(), false);

    // put next 80 bytes, should be saturated as 160 > 100
    buffer.put(vec![0u8; 80]);
    let buf_size = buffer.buf.len();
    assert_eq!(buffer.is_saturated(), true);
    assert_eq!(buf_size, 160);

    // get one chunk
    let padding: usize = 10;
    let expected_chunk_size = LIMIT - padding;
    let chunk = buffer.get_chunk(padding);
    assert_eq!(chunk.len(), expected_chunk_size); // 90

    // buffer should not be saturated now (160 - 90 < 100)
    let remaining_buf_size = buffer.buf.len();
    assert_eq!(remaining_buf_size, buf_size - expected_chunk_size);
    assert_eq!(buffer.is_saturated(), false);

    // get last chunk
    let chunk = buffer.get_chunk(padding);
    assert_eq!(chunk.len(), remaining_buf_size);
    assert_eq!(buffer.is_empty(), true);
  }
}
