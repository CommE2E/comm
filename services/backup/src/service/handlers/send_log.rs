use tonic::Status;
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
    unimplemented!()
  }
  pub async fn handle_backup_id(
    &mut self,
    backup_id: String,
  ) -> Result<(), Status> {
    unimplemented!()
  }
  pub async fn handle_log_hash(
    &mut self,
    log_hash: Vec<u8>,
  ) -> Result<(), Status> {
    unimplemented!()
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
}
