use bytesize::ByteSize;
use comm_services_lib::{auth::UserIdentity, backup::LatestBackupIDResponse};
use commtest::{
  backup::{
    backup_utils::BackupData,
    create_new_backup,
    pull_backup::{self, BackupDescriptor, RequestedData},
  },
  tools::{generate_stable_nbytes, Error},
};
use std::env;

#[tokio::test]
async fn backup_integration_test() -> Result<(), Error> {
  let port = env::var("COMM_SERVICES_PORT_BACKUP")
    .expect("port env var expected but not received")
    .parse()
    .expect("port env var should be a number");

  let mut url = reqwest::Url::parse("http://localhost")?;
  url.set_port(Some(port)).expect("failed to set port");

  let backup_datas = [
    BackupData {
      backup_id: "b1".to_string(),
      user_keys_hash: "kh1".to_string(),
      user_keys: generate_stable_nbytes(
        ByteSize::kib(4).as_u64() as usize,
        Some(b'a'),
      ),
      user_data_hash: "dh1".to_string(),
      user_data: generate_stable_nbytes(
        ByteSize::mib(4).as_u64() as usize,
        Some(b'A'),
      ),
      attachments: vec![],
    },
    BackupData {
      backup_id: "b2".to_string(),
      user_keys_hash: "kh2".to_string(),
      user_keys: generate_stable_nbytes(
        ByteSize::kib(4).as_u64() as usize,
        Some(b'b'),
      ),
      user_data_hash: "dh2".to_string(),
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

  create_new_backup::run(url.clone(), &user_identity, &backup_datas[0]).await?;
  create_new_backup::run(url.clone(), &user_identity, &backup_datas[1]).await?;

  // Test direct lookup
  let second_backup_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_datas[1].backup_id.clone(),
    user_identity: user_identity.clone(),
  };

  let user_keys = pull_backup::run(
    url.clone(),
    second_backup_descriptor.clone(),
    RequestedData::UserKeys,
  )
  .await?;
  assert_eq!(user_keys, backup_datas[1].user_keys);

  let user_data = pull_backup::run(
    url.clone(),
    second_backup_descriptor.clone(),
    RequestedData::UserData,
  )
  .await?;
  assert_eq!(user_data, backup_datas[1].user_data);

  // Test latest backup lookup
  let latest_backup_descriptor = BackupDescriptor::Latest {
    // Initial version of the backup service uses `user_id` in place of a username
    username: "1".to_string(),
  };

  let backup_id_response = pull_backup::run(
    url.clone(),
    latest_backup_descriptor.clone(),
    RequestedData::BackupID,
  )
  .await?;
  let response: LatestBackupIDResponse =
    serde_json::from_slice(&backup_id_response)?;
  assert_eq!(response.backup_id, backup_datas[1].backup_id);

  let user_keys = pull_backup::run(
    url.clone(),
    latest_backup_descriptor.clone(),
    RequestedData::UserKeys,
  )
  .await?;
  assert_eq!(user_keys, backup_datas[1].user_keys);

  Ok(())
}
