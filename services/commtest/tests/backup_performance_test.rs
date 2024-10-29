use backup_client::{
  BackupClient, BackupData, BackupDescriptor, RequestedData,
};
use bytesize::ByteSize;
use comm_lib::{auth::UserIdentity, backup::LatestBackupIDResponse};
use commtest::identity::device::register_user_device;
use commtest::{
  service_addr,
  tools::{generate_stable_nbytes, obtain_number_of_threads, Error},
};
use grpc_clients::identity::DeviceType;
use tokio::{runtime::Runtime, task::JoinSet};

#[tokio::test]
async fn backup_performance_test() -> Result<(), Error> {
  let backup_client = BackupClient::new(service_addr::BACKUP_SERVICE_HTTP)?;

  let number_of_threads = obtain_number_of_threads();

  let rt = Runtime::new().unwrap();

  println!(
    "Running performance tests for backup, number of threads: {}",
    number_of_threads
  );

  let mut backup_data = vec![];
  for i in 0..number_of_threads {
    backup_data.push(BackupData {
      backup_id: format!("b{i}"),
      user_keys: generate_stable_nbytes(
        ByteSize::kib(4).as_u64() as usize,
        Some(i as u8),
      ),
      user_data: generate_stable_nbytes(
        ByteSize::mib(4).as_u64() as usize,
        Some(i as u8),
      ),
      attachments: vec![],
      siwe_backup_msg: None,
    });
  }

  let device_info_1 = register_user_device(None, Some(DeviceType::Ios)).await;
  let device_info_2 = register_user_device(None, Some(DeviceType::Ios)).await;

  let user_identities = [
    UserIdentity {
      user_id: device_info_1.user_id.clone(),
      access_token: device_info_1.access_token,
      device_id: device_info_1.device_id,
    },
    UserIdentity {
      user_id: device_info_2.user_id.clone(),
      access_token: device_info_2.access_token,
      device_id: device_info_2.device_id,
    },
  ];

  tokio::task::spawn_blocking(move || {
    println!("Creating new backups");
    rt.block_on(async {
      let mut set = JoinSet::new();
      for (i, item) in backup_data.iter().cloned().enumerate() {
        let backup_client = backup_client.clone();
        let user = user_identities[i % user_identities.len()].clone();

        set.spawn(async move {
          backup_client.upload_backup(&user, item).await.unwrap();
        });
      }

      while let Some(result) = set.join_next().await {
        result.unwrap();
      }
    });

    let mut latest_ids_for_user = vec![];
    println!("Reading latest ids");
    rt.block_on(async {
      let mut handlers = vec![];
      for user in &user_identities {
        let backup_client = backup_client.clone();

        let username = if user.user_id == device_info_1.user_id {
          device_info_1.username.clone()
        } else {
          device_info_2.username.clone()
        };

        let descriptor = BackupDescriptor::Latest { username };

        handlers.push(tokio::spawn(async move {
          let response = backup_client
            .download_backup_data(&descriptor, RequestedData::BackupID)
            .await
            .unwrap();

          serde_json::from_slice::<LatestBackupIDResponse>(&response).unwrap()
        }));
      }

      for handler in handlers {
        latest_ids_for_user.push(handler.await.unwrap().backup_id);
      }
    });

    assert_eq!(latest_ids_for_user.len(), user_identities.len());

    let mut latest_user_keys_for_user = vec![];
    println!("Reading latest user keys");
    rt.block_on(async {
      let mut handlers = vec![];
      for user in &user_identities {
        let backup_client = backup_client.clone();
        let username = if user.user_id == device_info_1.user_id {
          device_info_1.username.clone()
        } else {
          device_info_2.username.clone()
        };

        let descriptor = BackupDescriptor::Latest { username };

        handlers.push(tokio::spawn(async move {
          backup_client
            .download_backup_data(&descriptor, RequestedData::UserKeys)
            .await
            .unwrap()
        }));
      }

      for handler in handlers {
        latest_user_keys_for_user.push(handler.await.unwrap());
      }
    });

    assert_eq!(latest_user_keys_for_user.len(), user_identities.len());
    for (backup_id, user_keys) in
      latest_ids_for_user.iter().zip(latest_user_keys_for_user)
    {
      let backup = backup_data
        .iter()
        .find(|data| data.backup_id == *backup_id)
        .expect("Request should return existing backup data");

      assert_eq!(backup.user_keys, user_keys);
    }

    let mut latest_user_data_for_user = vec![];
    println!("Reading latest user data");
    rt.block_on(async {
      let mut handlers = vec![];
      for (i, backup_id) in latest_ids_for_user.iter().enumerate() {
        let backup_client = backup_client.clone();
        let descriptor = BackupDescriptor::BackupID {
          backup_id: backup_id.clone(),
          user_identity: user_identities[i % user_identities.len()].clone(),
        };
        handlers.push(tokio::spawn(async move {
          backup_client
            .download_backup_data(&descriptor, RequestedData::UserData)
            .await
            .unwrap()
        }));
      }

      for handler in handlers {
        latest_user_data_for_user.push(handler.await.unwrap());
      }
    });

    assert_eq!(latest_user_data_for_user.len(), user_identities.len());
    for (backup_id, user_data) in
      latest_ids_for_user.iter().zip(latest_user_data_for_user)
    {
      let backup = backup_data
        .iter()
        .find(|data| data.backup_id == *backup_id)
        .expect("Request should return existing backup data");

      assert_eq!(backup.user_data, user_data);
    }
  })
  .await
  .expect("Task panicked");

  Ok(())
}
