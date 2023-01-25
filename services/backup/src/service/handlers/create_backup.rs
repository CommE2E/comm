use tonic::Status;
use tracing::{debug, error, trace, warn};

use crate::{
  blob::{start_simple_uploader, BlobClient, BlobUploader},
  database::{BackupItem, DatabaseClient},
  service::proto,
};

use super::handle_db_error;

type CreateBackupResult = Result<proto::CreateNewBackupResponse, Status>;

enum HandlerState {
  /// Initial state. Handler is receiving non-data inputs
  ReceivingParams,
  /// Handler is receiving data chunks
  ReceivingData { uploader: BlobUploader },
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
  blob_client: BlobClient,

  // internal state
  state: HandlerState,
  backup_id: String,
  holder: Option<String>,
}

impl CreateBackupHandler {
  pub fn new(db: DatabaseClient, blob_client: BlobClient) -> Self {
    CreateBackupHandler {
      should_close_stream: false,
      user_id: None,
      device_id: None,
      key_entropy: None,
      data_hash: None,
      db,
      blob_client,
      state: HandlerState::ReceivingParams,
      backup_id: String::new(),
      holder: None,
    }
  }

  pub async fn handle_user_id(
    &mut self,
    user_id: String,
  ) -> CreateBackupResult {
    if self.user_id.is_some() {
      warn!("user ID already provided");
      return Err(Status::invalid_argument("User ID already provided"));
    }
    self.user_id = Some(user_id);
    self.handle_internal().await
  }
  pub async fn handle_device_id(
    &mut self,
    device_id: String,
  ) -> CreateBackupResult {
    if self.device_id.is_some() {
      warn!("Device ID already provided");
      return Err(Status::invalid_argument("Device ID already provided"));
    }
    tracing::Span::current().record("device_id", &device_id);
    self.device_id = Some(device_id);
    self.handle_internal().await
  }
  pub async fn handle_key_entropy(
    &mut self,
    key_entropy: Vec<u8>,
  ) -> CreateBackupResult {
    if self.key_entropy.is_some() {
      warn!("Key entropy already provided");
      return Err(Status::invalid_argument("Key entropy already provided"));
    }
    self.key_entropy = Some(key_entropy);
    self.handle_internal().await
  }
  pub async fn handle_data_hash(
    &mut self,
    data_hash: Vec<u8>,
  ) -> CreateBackupResult {
    if self.data_hash.is_some() {
      warn!("Data hash already provided");
      return Err(Status::invalid_argument("Data hash already provided"));
    }
    let hash_str = String::from_utf8(data_hash).map_err(|err| {
      error!("Failed to convert data_hash into string: {:?}", err);
      Status::aborted("Unexpected error")
    })?;
    tracing::Span::current().record("data_hash", &hash_str);
    self.data_hash = Some(hash_str);
    self.handle_internal().await
  }

  pub async fn handle_data_chunk(
    &mut self,
    data_chunk: Vec<u8>,
  ) -> CreateBackupResult {
    let HandlerState::ReceivingData { ref mut uploader } = self.state else {
      self.should_close_stream = true;
      error!("Data chunk sent before other inputs");
      return Err(Status::invalid_argument(
        "Data chunk sent before other inputs",
      ));
    };

    // empty chunk ends transmission
    if data_chunk.is_empty() {
      self.should_close_stream = true;
      return Ok(proto::CreateNewBackupResponse {
        backup_id: self.backup_id.clone(),
      });
    }

    trace!("Received {} bytes of data", data_chunk.len());
    uploader.put_data(data_chunk).await.map_err(|err| {
      error!("Failed to upload data chunk: {:?}", err);
      Status::aborted("Internal error")
    })?;

    Ok(proto::CreateNewBackupResponse {
      // actual Backup ID should be sent only once, the time it is generated
      // see handle_internal()
      backup_id: String::new(),
    })
  }

  /// This function should be called after the input stream is finished.
  pub async fn finish(self) -> Result<(), Status> {
    match self.state {
      HandlerState::ReceivingParams => {
        // client probably aborted early
        trace!("Nothing to store in database. Finishing early");
        return Ok(());
      }
      HandlerState::ReceivingData { uploader } => {
        uploader.terminate().await.map_err(|err| {
          error!("Uploader task closed with error: {:?}", err);
          Status::aborted("Internal error")
        })?;
      }
      HandlerState::DataAlreadyExists => (),
    }

    let (Some(user_id), Some(holder)) = (self.user_id, self.holder) else {
      error!("Holder / UserID absent in data mode. This should never happen!");
      return Err(Status::failed_precondition("Internal error"));
    };
    if self.backup_id.is_empty() {
      error!("Backup ID was not generated. This should never happen!");
      return Err(Status::failed_precondition("Internal error"));
    }
    let backup_item = BackupItem::new(user_id, self.backup_id, holder);

    self
      .db
      .put_backup_item(backup_item)
      .await
      .map_err(handle_db_error)?;

    Ok(())
  }

  // internal param handler helper
  async fn handle_internal(&mut self) -> CreateBackupResult {
    if !matches!(self.state, HandlerState::ReceivingParams) {
      error!("CreateBackupHandler already received all non-data params.");
      return Err(Status::failed_precondition("Backup data chunk expected"));
    }

    // all non-data inputs must be set before receiving backup data chunks
    let (Some(data_hash), Some(device_id), Some(_), Some(_)) = (
      self.data_hash.as_ref(),
      self.device_id.as_ref(),
      self.user_id.as_ref(),
      self.key_entropy.as_ref(),
    ) else {
      // return empty backup ID when inputs are incomplete
      return Ok(proto::CreateNewBackupResponse {
        backup_id: "".to_string(),
      });
    };

    let backup_id = generate_backup_id(device_id);
    let holder =
      crate::utils::generate_blob_holder(data_hash, &backup_id, None);
    self.backup_id = backup_id.clone();
    self.holder = Some(holder.clone());
    tracing::Span::current().record("backup_id", &backup_id);
    tracing::Span::current().record("blob_holder", &holder);

    match start_simple_uploader(&holder, data_hash, self.blob_client.clone())
      .await?
    {
      Some(uploader) => {
        self.state = HandlerState::ReceivingData { uploader };
        trace!("Everything prepared, waiting for data...");
      }
      None => {
        // Blob with given data_hash already exists
        debug!("Blob already exists, finishing");
        self.should_close_stream = true;
        self.state = HandlerState::DataAlreadyExists;
      }
    };

    Ok(proto::CreateNewBackupResponse { backup_id })
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
