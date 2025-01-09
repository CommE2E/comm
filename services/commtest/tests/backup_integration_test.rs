use backup_client::{
  BackupClient, BackupDescriptor, DownloadedLog, LogUploadConfirmation,
  RequestedData, SinkExt, StreamExt, TryStreamExt,
};
use comm_lib::backup::LatestBackupInfoResponse;
use commtest::backup::backup_utils::{
  assert_reqwest_error, create_user_identity, generate_backup_data_with_logs,
};
use commtest::identity::device::register_user_device;
use commtest::{service_addr, tools::Error};
use grpc_clients::identity::DeviceType;
use reqwest::StatusCode;
use std::collections::HashSet;

#[tokio::test]
async fn backup_integration_test() -> Result<(), Error> {
  let backup_client = BackupClient::new(service_addr::BACKUP_SERVICE_HTTP)?;

  let device_info = register_user_device(None, Some(DeviceType::Ios)).await;
  let user_identity = create_user_identity(device_info.clone());

  let backup_datas = generate_backup_data_with_logs(vec![b'a', b'b']);

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
  assert_eq!(Some(user_keys), backup_data.user_keys);

  let user_data = backup_client
    .download_backup_data(&second_backup_descriptor, RequestedData::UserData)
    .await?;
  assert_eq!(Some(user_data), backup_data.user_data);

  // Test latest backup lookup for nonexistent user
  let latest_backup_descriptor = BackupDescriptor::Latest {
    user_identifier: "nonexistent_user".to_string(),
  };

  let nonexistent_user_response = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::BackupInfo)
    .await;

  assert!(
    matches!(
      nonexistent_user_response,
      Err(backup_client::Error::UserNotFound)
    ),
    "Backup expected to return UserNotFound"
  );

  // Test latest backup lookup
  let latest_backup_descriptor = BackupDescriptor::Latest {
    user_identifier: device_info.username,
  };

  let backup_info_response = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::BackupInfo)
    .await?;
  let response: LatestBackupInfoResponse =
    serde_json::from_slice(&backup_info_response)?;
  assert_eq!(response.backup_id, backup_data.backup_id);
  assert_eq!(response.user_id, device_info.user_id);
  assert_eq!(response.siwe_backup_msg, backup_data.siwe_backup_msg);

  let user_keys = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::UserKeys)
    .await?;
  assert_eq!(Some(user_keys), backup_data.user_keys);

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

  assert!(
    matches!(response, Err(backup_client::Error::BackupNotFound)),
    "Backup expected to return BackupNotFound"
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
