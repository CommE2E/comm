use tonic::Status;
use tracing::{debug, error, trace, warn};
use uuid::Uuid;

use super::handle_db_error;
use crate::{
  blob::{BlobClient, BlobUploader},
  constants::{ID_SEPARATOR, LOG_DATA_SIZE_DATABASE_LIMIT},
  database::{DatabaseClient, LogItem},
  service::proto::SendLogResponse,
};

enum LogPersistence {
  /// Log entirely stored in DynamoDB database
  DB,
  /// Log contents stored with Blob service
  BLOB { holder: String },
}

pub struct SendLogHandler {
  // flow control
  pub should_close_stream: bool,

  // inputs
  user_id: Option<String>,
  backup_id: Option<String>,
  log_hash: Option<String>,

  // internal state
  log_id: Option<String>,
  log_buffer: Vec<u8>,
  persistence_method: LogPersistence,
  should_receive_data: bool,

  // client instances
  db: DatabaseClient,
  blob_client: BlobClient,
  uploader: Option<BlobUploader>,
}

impl SendLogHandler {
  pub fn new(db: &DatabaseClient, blob_client: &BlobClient) -> Self {
    SendLogHandler {
      db: db.clone(),
      blob_client: blob_client.clone(),
      uploader: None,
      user_id: None,
      backup_id: None,
      log_hash: None,
      log_id: None,
      log_buffer: Vec::new(),
      persistence_method: LogPersistence::DB,
      should_receive_data: false,
      should_close_stream: false,
    }
  }

  pub async fn handle_user_id(
    &mut self,
    user_id: String,
  ) -> Result<(), Status> {
    if self.user_id.is_some() {
      warn!("user ID already provided");
      return Err(Status::invalid_argument("User ID already provided"));
    }
    self.user_id = Some(user_id);
    self.handle_internal().await
  }
  pub async fn handle_backup_id(
    &mut self,
    backup_id: String,
  ) -> Result<(), Status> {
    if self.backup_id.is_some() {
      warn!("backup ID already provided");
      return Err(Status::invalid_argument("Backup ID already provided"));
    }
    tracing::Span::current().record("backup_id", &backup_id);
    self.backup_id = Some(backup_id);
    self.handle_internal().await
  }
  pub async fn handle_log_hash(
    &mut self,
    log_hash: Vec<u8>,
  ) -> Result<(), Status> {
    if self.log_hash.is_some() {
      warn!("Log hash already provided");
      return Err(Status::invalid_argument("Log hash already provided"));
    }
    let hash_str = String::from_utf8(log_hash).map_err(|err| {
      error!("Failed to convert data_hash into string: {:?}", err);
      Status::aborted("Unexpected error")
    })?;
    debug!("Received log hash: {}", &hash_str);
    self.log_hash = Some(hash_str);
    self.handle_internal().await
  }
  pub async fn handle_log_data(
    &mut self,
    data_chunk: Vec<u8>,
  ) -> Result<(), Status> {
    if !self.should_receive_data || self.log_id.is_none() {
      self.should_close_stream = true;
      error!("Data chunk sent before other inputs");
      return Err(Status::invalid_argument(
        "Data chunk sent before other inputs",
      ));
    }

    // empty chunk ends transmission
    if data_chunk.is_empty() {
      self.should_close_stream = true;
      return Ok(());
    }

    match self.persistence_method {
      LogPersistence::DB => {
        self.log_buffer.extend(data_chunk);
        self.ensure_size_constraints().await?;
      }
      LogPersistence::BLOB { .. } => {
        let Some(client) = self.uploader.as_mut() else {
          self.should_close_stream = true;
          error!("Put client uninitialized. This should never happen!");
          return Err(Status::failed_precondition("Internal error"));
        };
        client.put_data(data_chunk).await.map_err(|err| {
          error!("Failed to upload data chunk: {:?}", err);
          Status::aborted("Internal error")
        })?;
      }
    }
    Ok(())
  }

  pub async fn finish(self) -> Result<SendLogResponse, Status> {
    if let Some(client) = self.uploader {
      client.terminate().await.map_err(|err| {
        error!("Put client task closed with error: {:?}", err);
        Status::aborted("Internal error")
      })?;
    } else {
      trace!("No uploader initialized. Skipping termination");
    }

    if !self.should_receive_data {
      // client probably aborted early
      trace!("Nothing to store in database. Finishing early");
      return Ok(SendLogResponse {
        log_checkpoint: "".to_string(),
      });
    }

    let (Some(backup_id), Some(log_id), Some(data_hash)) = (
      self.backup_id,
      self.log_id,
      self.log_hash
    ) else {
      error!("Log info absent in data mode. This should never happen!");
      return Err(Status::failed_precondition("Internal error"));
     };

    let (log_value, persisted_in_blob) = match self.persistence_method {
      LogPersistence::BLOB { holder } => (holder, true),
      LogPersistence::DB => {
        let contents = String::from_utf8(self.log_buffer).map_err(|err| {
          error!("Failed to convert log contents data into string: {:?}", err);
          Status::aborted("Unexpected error")
        })?;
        (contents, false)
      }
    };

    let log_item = LogItem {
      backup_id,
      log_id: log_id.clone(),
      persisted_in_blob,
      value: log_value,
      attachment_holders: String::new(),
      data_hash,
    };

    self
      .db
      .put_log_item(log_item)
      .await
      .map_err(handle_db_error)?;

    Ok(SendLogResponse {
      log_checkpoint: log_id,
    })
  }

  // internal param handler helper
  async fn handle_internal(&mut self) -> Result<(), Status> {
    if self.should_receive_data {
      error!("SendLogHandler is already expecting data chunks");
      return Err(Status::failed_precondition("Log data chunk expected"));
    }

    // all non-data inputs must be set before receiving log contents
    let (Some(backup_id), Some(_), Some(_)) = (
      self.backup_id.as_ref(),
      self.user_id.as_ref(),
      self.log_hash.as_ref()
    ) else { return Ok(()); };

    let log_id = generate_log_id(backup_id);
    tracing::Span::current().record("log_id", &log_id);
    self.log_id = Some(log_id);

    trace!("Everything prepared, waiting for data...");
    self.should_receive_data = true;
    Ok(())
  }

  /// Ensures log fits db size constraints. If not, it is moved to blob
  /// persistence
  async fn ensure_size_constraints(&mut self) -> Result<(), Status> {
    let (Some(backup_id), Some(log_id), Some(log_hash)) = (
      self.backup_id.as_ref(),
      self.log_id.as_ref(),
      self.log_hash.as_ref()
    ) else {
      self.should_close_stream = true;
      error!("Log info absent in data mode. This should never happen!");
      return Err(Status::failed_precondition("Internal error"));
     };

    let log_size = LogItem::size_from_components(
      backup_id,
      log_id,
      log_hash,
      &self.log_buffer,
    );
    if log_size > LOG_DATA_SIZE_DATABASE_LIMIT {
      debug!("Log too large, switching persistence to Blob");
      let holder =
        crate::utils::generate_blob_holder(log_hash, backup_id, Some(log_id));
      match crate::blob::start_simple_uploader(
        &holder,
        &log_hash,
        self.blob_client.clone(),
      )
      .await?
      {
        Some(mut uploader) => {
          let blob_chunk = std::mem::take(&mut self.log_buffer);
          uploader.put_data(blob_chunk).await.map_err(|err| {
            error!("Failed to upload data chunk: {:?}", err);
            Status::aborted("Internal error")
          })?;
          self.uploader = Some(uploader);
        }
        None => {
          debug!("Log hash already exists");
          self.should_close_stream = true;
        }
      }
      self.persistence_method = LogPersistence::BLOB { holder };
    }
    Ok(())
  }
}

fn generate_log_id(backup_id: &str) -> String {
  format!(
    "{backup_id}{sep}{uuid}",
    backup_id = backup_id,
    sep = ID_SEPARATOR,
    uuid = Uuid::new_v4()
  )
}
