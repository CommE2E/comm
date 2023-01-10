use tonic::Status;
use tracing::{error, trace, warn};
use uuid::Uuid;

use crate::{
  blob::PutClient, constants::ID_SEPARATOR, database::DatabaseClient,
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
  blob_client: Option<PutClient>,
}

impl SendLogHandler {
  pub fn new(db: &DatabaseClient) -> Self {
    SendLogHandler {
      db: db.clone(),
      blob_client: None,
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
    tracing::Span::current().record("log_hash", &hash_str);
    self.log_hash = Some(hash_str);
    self.handle_internal().await
  }
  pub async fn handle_log_data(
    &mut self,
    data_chunk: Vec<u8>,
  ) -> Result<(), Status> {
    unimplemented!()
  }

  pub async fn finish(self) -> Result<SendLogResponse, Status> {
    unimplemented!()
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
}

fn generate_log_id(backup_id: &str) -> String {
  format!(
    "{backup_id}{sep}{uuid}",
    backup_id = backup_id,
    sep = ID_SEPARATOR,
    uuid = Uuid::new_v4()
  )
}
