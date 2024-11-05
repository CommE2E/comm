use backup_client::{
  BackupClient, BackupData, BackupDescriptor, RequestedData,
};
use comm_lib::backup::LatestBackupInfoResponse;
use commtest::backup::backup_utils::{
  assert_reqwest_error, create_user_identity, generate_backup_data,
};
use commtest::identity::device::register_user_device;
use commtest::{service_addr, tools::Error};
use grpc_clients::identity::DeviceType;
use reqwest::StatusCode;

#[tokio::test]
async fn backup_upload_user_keys() -> Result<(), Error> {
  let backup_client = BackupClient::new(service_addr::BACKUP_SERVICE_HTTP)?;

  let device_info = register_user_device(None, Some(DeviceType::Ios)).await;
  let user_identity = create_user_identity(device_info.clone());

  let backup_data = BackupData {
    user_data: None,
    ..generate_backup_data(b'a')
  };

  // Upload backup (User Keys)
  backup_client
    .upload_backup(&user_identity, backup_data.clone())
    .await?;

  // Test User Keys download
  let backup_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_data.backup_id.clone(),
    user_identity: user_identity.clone(),
  };
  let user_keys = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserKeys)
    .await?;

  assert_eq!(Some(user_keys), backup_data.user_keys);

  // Test latest backup lookup without User Data
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

  let user_keys = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::UserKeys)
    .await?;
  assert_eq!(Some(user_keys), backup_data.user_keys);

  // Test backup cleanup for User Keys only
  let new_backup_data = BackupData {
    user_data: None,
    ..generate_backup_data(b'b')
  };

  backup_client
    .upload_backup(&user_identity, new_backup_data.clone())
    .await?;

  // Test Data download for old `backup_id` -> should be not found
  let user_data_response = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserData)
    .await;
  let user_keys_response = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserKeys)
    .await;

  assert_reqwest_error(user_data_response, StatusCode::NOT_FOUND);
  assert_reqwest_error(user_keys_response, StatusCode::NOT_FOUND);

  Ok(())
}

#[tokio::test]
async fn backup_upload_the_same_user_keys() -> Result<(), Error> {
  let backup_client = BackupClient::new(service_addr::BACKUP_SERVICE_HTTP)?;

  let device_info = register_user_device(None, Some(DeviceType::Ios)).await;
  let user_identity = create_user_identity(device_info);

  let backup_data = BackupData {
    user_data: None,
    ..generate_backup_data(b'a')
  };

  // Upload backup twice (User Keys only)
  backup_client
    .upload_backup(&user_identity, backup_data.clone())
    .await?;

  backup_client
    .upload_backup(&user_identity, backup_data.clone())
    .await?;

  // Test User Keys download
  let backup_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_data.backup_id.clone(),
    user_identity: user_identity.clone(),
  };
  let user_keys = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserKeys)
    .await?;

  assert_eq!(Some(user_keys), backup_data.user_keys);

  Ok(())
}

#[tokio::test]
async fn backup_upload_user_data_without_user_keys() -> Result<(), Error> {
  let backup_client = BackupClient::new(service_addr::BACKUP_SERVICE_HTTP)?;

  let device_info = register_user_device(None, Some(DeviceType::Ios)).await;
  let user_identity = create_user_identity(device_info);

  let backup_data = BackupData {
    user_keys: None,
    ..generate_backup_data(b'a')
  };

  // Upload backup (User Data) -> should fail,
  // there is no corresponding User Keys
  let response = backup_client
    .upload_backup(&user_identity, backup_data.clone())
    .await;

  assert_reqwest_error(response, StatusCode::NOT_FOUND);

  Ok(())
}

#[tokio::test]
async fn backup_upload_user_keys_and_user_data() -> Result<(), Error> {
  let backup_client = BackupClient::new(service_addr::BACKUP_SERVICE_HTTP)?;

  let device_info = register_user_device(None, Some(DeviceType::Ios)).await;
  let user_identity = create_user_identity(device_info.clone());

  let backup_data = generate_backup_data(b'a');
  let user_keys = BackupData {
    user_data: None,
    ..backup_data.clone()
  };
  let user_data = BackupData {
    user_keys: None,
    ..backup_data.clone()
  };

  // Upload backups (User Keys and User Data)
  backup_client
    .upload_backup(&user_identity, user_keys.clone())
    .await?;

  backup_client
    .upload_backup(&user_identity, user_data.clone())
    .await?;

  // Test User Keys download
  let backup_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_data.backup_id.clone(),
    user_identity: user_identity.clone(),
  };
  let user_keys = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserKeys)
    .await?;

  assert_eq!(Some(user_keys), backup_data.user_keys);

  // Test User Data download
  let user_data = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserData)
    .await?;
  assert_eq!(Some(user_data), backup_data.user_data);

  // Upload new User Data
  let new_backup_data = generate_backup_data(b'b');
  let new_user_data = BackupData {
    // Important we using the same `backup_id`
    backup_id: backup_data.backup_id.clone(),
    user_keys: None,
    user_data: new_backup_data.user_data.clone(),
    attachments: new_backup_data.attachments,
    siwe_backup_msg: None,
  };

  backup_client
    .upload_backup(&user_identity, new_user_data.clone())
    .await?;

  // Test User Keys download again -> should remain unchanged
  let backup_descriptor = BackupDescriptor::BackupID {
    backup_id: new_user_data.backup_id.clone(),
    user_identity: user_identity.clone(),
  };
  let user_keys = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserKeys)
    .await?;

  assert_eq!(Some(user_keys), backup_data.user_keys);

  // Test User Data download, should be updated
  let user_data = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserData)
    .await?;

  assert_eq!(Some(user_data), new_backup_data.user_data);

  // Upload new User Keys -> should override User Keys and keep User Data unchanged
  let new_user_keys = BackupData {
    user_data: None,
    // backup_id: backup_data.backup_id.clone(),
    ..generate_backup_data(b'c')
  };

  backup_client
    .upload_backup(&user_identity, new_user_keys.clone())
    .await?;

  // Test latest backup -> should return newest `backup_id`
  let latest_backup_descriptor = BackupDescriptor::Latest {
    user_identifier: device_info.username,
  };
  let backup_info_response = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::BackupInfo)
    .await?;
  let response: LatestBackupInfoResponse =
    serde_json::from_slice(&backup_info_response)?;

  assert_eq!(response.backup_id, new_user_keys.backup_id);
  assert_eq!(response.user_id, device_info.user_id);

  // Test User Keys download -> should be updated
  let backup_descriptor = BackupDescriptor::BackupID {
    backup_id: new_user_keys.backup_id.clone(),
    user_identity: user_identity.clone(),
  };
  let user_keys = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserKeys)
    .await?;

  assert_eq!(Some(user_keys), new_user_keys.user_keys);

  // Test User Data download -> should be the old one
  let backup_descriptor = BackupDescriptor::BackupID {
    backup_id: new_user_keys.backup_id.clone(),
    user_identity: user_identity.clone(),
  };
  let user_data = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserData)
    .await?;

  assert_eq!(Some(user_data), new_backup_data.user_data);

  // Test Data download for old `backup_id` -> should be not found
  let removed_backup_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_data.backup_id.clone(),
    user_identity: user_identity.clone(),
  };
  let user_data_response = backup_client
    .download_backup_data(&removed_backup_descriptor, RequestedData::UserData)
    .await;
  let user_keys_response = backup_client
    .download_backup_data(&removed_backup_descriptor, RequestedData::UserKeys)
    .await;

  assert_reqwest_error(user_data_response, StatusCode::NOT_FOUND);
  assert_reqwest_error(user_keys_response, StatusCode::NOT_FOUND);

  Ok(())
}
