use tonic::Status;

use crate::{blob::PutClient, database::DatabaseClient, service::proto};

type CreateBackupResult = Result<proto::CreateNewBackupResponse, Status>;

enum HandlerState {
  /// Initial state. Handler is receiving non-data inputs
  ReceivingParams,
  /// Handler is receiving data chunks
  ReceivingData { blob_client: PutClient },
  /// A special case when Blob service claims that a blob with given
  /// [`CreateBackupHandler::data_hash`] already exists
  DataAlreadyExists,
}

pub struct CreateBackupHandler {
  // flow control
  pub should_close_stream: bool,

  // inputs
  user_id: Option<String>,
  device_id: Option<String>,
  key_entropy: Option<Vec<u8>>,
  data_hash: Option<String>,

  // client instances
  db: DatabaseClient,

  // internal state
  state: HandlerState,
  backup_id: String,
  holder: Option<String>,
}

impl CreateBackupHandler {
  pub fn new(db: &DatabaseClient) -> Self {
    CreateBackupHandler {
      should_close_stream: false,
      user_id: None,
      device_id: None,
      key_entropy: None,
      data_hash: None,
      db: db.clone(),
      state: HandlerState::ReceivingParams,
      backup_id: String::new(),
      holder: None,
    }
  }

  pub async fn handle_user_id(
    &mut self,
    user_id: String,
  ) -> CreateBackupResult {
    unimplemented!()
  }
  pub async fn handle_device_id(
    &mut self,
    device_id: String,
  ) -> CreateBackupResult {
    unimplemented!()
  }
  pub async fn handle_key_entropy(
    &mut self,
    key_entropy: Vec<u8>,
  ) -> CreateBackupResult {
    unimplemented!()
  }
  pub async fn handle_data_hash(
    &mut self,
    data_hash: Vec<u8>,
  ) -> CreateBackupResult {
    unimplemented!()
  }

  pub async fn handle_data_chunk(
    &mut self,
    data_chunk: Vec<u8>,
  ) -> CreateBackupResult {
    unimplemented!()
  }

  /// This function should be called after the input stream is finished.
  pub async fn finish(self) -> Result<(), Status> {
    unimplemented!()
  }
}

/// Generates ID for a new backup
fn generate_backup_id(device_id: &str) -> String {
  format!(
    "{device_id}_{timestamp}",
    device_id = device_id,
    timestamp = chrono::Utc::now().timestamp_millis()
  )
}
