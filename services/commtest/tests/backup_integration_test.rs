use backup_client::{
  BackupClient, BackupData, BackupDescriptor, DownloadedLog,
  Error as BackupClientError, LogUploadConfirmation, RequestedData, SinkExt,
  StreamExt, TryStreamExt,
};
use bytesize::ByteSize;
use comm_lib::{
  auth::UserIdentity,
  backup::{LatestBackupIDResponse, UploadLogRequest},
};
use commtest::identity::device::register_user_device;
use commtest::{
  service_addr,
  tools::{generate_stable_nbytes, Error},
};
use grpc_clients::identity::DeviceType;
use reqwest::StatusCode;
use std::collections::HashSet;
use uuid::Uuid;

#[tokio::test]
async fn backup_integration_test() -> Result<(), Error> {
  let backup_client = BackupClient::new(service_addr::BACKUP_SERVICE_HTTP)?;

  let device_info = register_user_device(None, Some(DeviceType::Ios)).await;

  let user_identity = UserIdentity {
    user_id: device_info.user_id.clone(),
    access_token: device_info.access_token,
    device_id: device_info.device_id,
  };

  let backup_datas = generate_backup_data();

  // Upload backups
  for (backup_data, log_datas) in &backup_datas {
    backup_client
      .upload_backup(&user_identity, backup_data.clone())
      .await?;

    let (mut tx, rx) = backup_client.upload_logs(&user_identity).await?;

    for log_data in log_datas {
      tx.send(log_data.clone()).await?;
    }

    let result: HashSet<LogUploadConfirmation> =
      rx.take(log_datas.len()).try_collect().await?;
    let expected = log_datas
      .iter()
      .map(|data| LogUploadConfirmation {
        backup_id: data.backup_id.clone(),
        log_id: data.log_id,
      })
      .collect();

    assert_eq!(result, expected);
  }

  // Test direct lookup
  let (backup_data, log_datas) = &backup_datas[1];

  let second_backup_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_data.backup_id.clone(),
    user_identity: user_identity.clone(),
  };

  let user_keys = backup_client
    .download_backup_data(&second_backup_descriptor, RequestedData::UserKeys)
    .await?;
  assert_eq!(user_keys, backup_data.user_keys);

  let user_data = backup_client
    .download_backup_data(&second_backup_descriptor, RequestedData::UserData)
    .await?;
  assert_eq!(user_data, backup_data.user_data);

  // Test latest backup lookup for not-existing user
  let latest_backup_descriptor = BackupDescriptor::Latest {
    username: "non_existing_user".to_string(),
  };

  let non_existing_user_response = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::BackupID)
    .await;

  match non_existing_user_response {
    Ok(_) => panic!("Expected error, but got success response"),
    Err(BackupClientError::ReqwestError(error)) => {
      assert_eq!(
        error.status(),
        Some(StatusCode::BAD_REQUEST),
        "Expected bad request status"
      );
    }
    Err(_) => panic!("Unexpected error type"),
  }

  // Test latest backup lookup
  let latest_backup_descriptor = BackupDescriptor::Latest {
    username: device_info.username,
  };

  let backup_id_response = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::BackupID)
    .await?;
  let response: LatestBackupIDResponse =
    serde_json::from_slice(&backup_id_response)?;
  assert_eq!(response.backup_id, backup_data.backup_id);

  let user_keys = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::UserKeys)
    .await?;
  assert_eq!(user_keys, backup_data.user_keys);

  // Test log download
  let log_stream = backup_client
    .download_logs(&user_identity, &backup_data.backup_id)
    .await;

  let downloaded_logs: Vec<DownloadedLog> = log_stream.try_collect().await?;

  let expected_logs: Vec<DownloadedLog> = log_datas
    .iter()
    .map(|data| DownloadedLog {
      content: data.content.clone(),
      attachments: data.attachments.clone(),
    })
    .collect();
  assert_eq!(downloaded_logs, expected_logs);

  // Test backup cleanup
  let (removed_backup, _) = &backup_datas[0];
  let removed_backup_descriptor = BackupDescriptor::BackupID {
    backup_id: removed_backup.backup_id.clone(),
    user_identity: user_identity.clone(),
  };

  let response = backup_client
    .download_backup_data(&removed_backup_descriptor, RequestedData::UserKeys)
    .await;

  let Err(BackupClientError::ReqwestError(error)) = response else {
    panic!("First backup should have been removed, instead got response: {response:?}");
  };

  assert_eq!(
    error.status(),
    Some(StatusCode::NOT_FOUND),
    "Expected status 'not found'"
  );

  // Test log cleanup
  let log_stream = backup_client
    .download_logs(&user_identity, &removed_backup.backup_id)
    .await;

  let downloaded_logs: Vec<DownloadedLog> = log_stream.try_collect().await?;

  if !downloaded_logs.is_empty() {
    panic!(
      "Logs for first backup should have been removed, \
      instead got: {downloaded_logs:?}"
    )
  }

  Ok(())
}

fn generate_backup_data() -> [(BackupData, Vec<UploadLogRequest>); 2] {
  [
    (
      BackupData {
        backup_id: "b1".to_string(),
        user_keys: generate_stable_nbytes(
          ByteSize::kib(4).as_u64() as usize,
          Some(b'a'),
        ),
        user_data: generate_stable_nbytes(
          ByteSize::mib(4).as_u64() as usize,
          Some(b'A'),
        ),
        attachments: vec![],
        siwe_backup_msg: None,
      },
      generate_log_data("b1", b'a'),
    ),
    (
      BackupData {
        backup_id: "b2".to_string(),
        user_keys: generate_stable_nbytes(
          ByteSize::kib(4).as_u64() as usize,
          Some(b'b'),
        ),
        user_data: generate_stable_nbytes(
          ByteSize::mib(4).as_u64() as usize,
          Some(b'B'),
        ),
        attachments: vec![],
        siwe_backup_msg: None,
      },
      generate_log_data("b2", b'b'),
    ),
  ]
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
