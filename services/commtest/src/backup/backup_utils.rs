use crate::identity::device::DeviceInfo;

use crate::tools::generate_stable_nbytes;
use backup_client::{BackupData, Error as BackupClientError};
use bytesize::ByteSize;
use comm_lib::auth::UserIdentity;
use comm_lib::backup::UploadLogRequest;
use reqwest::StatusCode;
use uuid::Uuid;

pub fn generate_backup_data(predefined_byte_value: u8) -> BackupData {
  BackupData {
    backup_id: Uuid::new_v4().to_string(),
    user_keys: generate_stable_nbytes(
      ByteSize::kib(4).as_u64() as usize,
      Some(predefined_byte_value),
    ),
    user_data: generate_stable_nbytes(
      ByteSize::mib(4).as_u64() as usize,
      Some(predefined_byte_value),
    ),
    attachments: vec![],
    siwe_backup_msg: None,
  }
}

fn generate_log_data(backup_id: &str, value: u8) -> Vec<UploadLogRequest> {
  const IN_DB_SIZE: usize = ByteSize::kib(4).as_u64() as usize;
  const IN_BLOB_SIZE: usize = ByteSize::kib(400).as_u64() as usize;

  (1..30)
    .map(|log_id| {
      let size = if log_id % 2 == 0 {
        IN_DB_SIZE
      } else {
        IN_BLOB_SIZE
      };
      let attachments = if log_id % 10 == 0 {
        Some(vec![Uuid::new_v4().to_string()])
      } else {
        None
      };
      let mut content = generate_stable_nbytes(size, Some(value));
      let unique_suffix = log_id.to_string();
      content.extend(unique_suffix.as_bytes());

      UploadLogRequest {
        backup_id: backup_id.to_string(),
        log_id,
        content,
        attachments,
      }
    })
    .collect()
}

pub fn generate_backup_data_with_logs(
  predefined_byte_values: Vec<u8>,
) -> Vec<(BackupData, Vec<UploadLogRequest>)> {
  predefined_byte_values
    .into_iter()
    .map(|byte_value| {
      let backup_data = generate_backup_data(byte_value);
      let log_data = generate_log_data(&backup_data.backup_id, byte_value);
      (backup_data, log_data)
    })
    .collect()
}

pub fn assert_reqwest_error<T>(
  response: Result<T, BackupClientError>,
  expected_status: StatusCode,
) {
  match response {
    Err(BackupClientError::ReqwestError(error)) => {
      assert_eq!(
        error.status(),
        Some(expected_status),
        "Expected status {}",
        expected_status
      );
    }
    Err(err) => panic!(
      "Backup should return ReqwestError, instead got response: {:?}",
      err
    ),
    Ok(_) => panic!("Backup should return BackupClientError"),
  }
}

pub fn create_user_identity(device_info: DeviceInfo) -> UserIdentity {
  UserIdentity {
    user_id: device_info.user_id.clone(),
    access_token: device_info.access_token.clone(),
    device_id: device_info.device_id.clone(),
  }
}
