use backup_client::{
  BackupClient, BackupData, BackupDescriptor, Error as BackupClientError,
  RequestedData,
};
use bytesize::ByteSize;
use comm_lib::{auth::UserIdentity, backup::LatestBackupIDResponse};
use commtest::{
  service_addr,
  tools::{generate_stable_nbytes, Error},
};
use reqwest::StatusCode;

#[tokio::test]
async fn backup_integration_test() -> Result<(), Error> {
  let backup_client = BackupClient::new(service_addr::BACKUP_SERVICE_HTTP)?;

  let backup_datas = [
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
    },
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
    },
  ];

  let user_identity = UserIdentity {
    user_id: "1".to_string(),
    access_token: "dummy access token".to_string(),
    device_id: "dummy device_id".to_string(),
  };

  backup_client
    .upload_backup(&user_identity, backup_datas[0].clone())
    .await?;
  backup_client
    .upload_backup(&user_identity, backup_datas[1].clone())
    .await?;

  // Test direct lookup
  let second_backup_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_datas[1].backup_id.clone(),
    user_identity: user_identity.clone(),
  };

  let user_keys = backup_client
    .download_backup_data(&second_backup_descriptor, RequestedData::UserKeys)
    .await?;
  assert_eq!(user_keys, backup_datas[1].user_keys);

  let user_data = backup_client
    .download_backup_data(&second_backup_descriptor, RequestedData::UserData)
    .await?;
  assert_eq!(user_data, backup_datas[1].user_data);

  // Test latest backup lookup
  let latest_backup_descriptor = BackupDescriptor::Latest {
    // Initial version of the backup service uses `user_id` in place of a username
    username: "1".to_string(),
  };

  let backup_id_response = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::BackupID)
    .await?;
  let response: LatestBackupIDResponse =
    serde_json::from_slice(&backup_id_response)?;
  assert_eq!(response.backup_id, backup_datas[1].backup_id);

  let user_keys = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::UserKeys)
    .await?;
  assert_eq!(user_keys, backup_datas[1].user_keys);

  // Test cleanup
  let first_backup_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_datas[0].backup_id.clone(),
    user_identity: user_identity.clone(),
  };

  let response = backup_client
    .download_backup_data(&first_backup_descriptor, RequestedData::UserKeys)
    .await;

  let Err(BackupClientError::ReqwestError(error)) = response else {
    panic!("First backup should have been removed, instead got response: {response:?}");
  };

  assert_eq!(
    error.status(),
    Some(StatusCode::NOT_FOUND),
    "Expected status 'not found'"
  );

  Ok(())
}
