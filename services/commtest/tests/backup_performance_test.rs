use bytesize::ByteSize;
use comm_services_lib::{auth::UserIdentity, backup::LatestBackupIDResponse};
use commtest::{
  backup::{
    backup_utils::BackupData,
    create_new_backup,
    pull_backup::{self, BackupDescriptor},
  },
  tools::{generate_stable_nbytes, obtain_number_of_threads, Error},
};
use std::env;
use tokio::{runtime::Runtime, task::JoinSet};

#[tokio::test]
async fn backup_performance_test() -> Result<(), Error> {
  let port = env::var("COMM_SERVICES_PORT_BACKUP")
    .expect("port env var expected but not received")
    .parse()
    .expect("port env var should be a number");

  let mut url = reqwest::Url::parse("http://localhost")?;
  url.set_port(Some(port)).expect("failed to set port");

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
      user_keys_hash: format!("kh{i}"),
      user_keys: generate_stable_nbytes(
        ByteSize::kib(4).as_u64() as usize,
        Some(i as u8),
      ),
      user_data_hash: format!("dh{i}"),
      user_data: generate_stable_nbytes(
        ByteSize::mib(4).as_u64() as usize,
        Some(i as u8),
      ),
      attachments: vec![],
    });
  }

  let user_identities = [
    UserIdentity {
      user_id: "1".to_string(),
      access_token: "dummy access token".to_string(),
      device_id: "dummy device_id".to_string(),
    },
    UserIdentity {
      user_id: "2".to_string(),
      access_token: "dummy access token".to_string(),
      device_id: "dummy device_id".to_string(),
    },
  ];

  tokio::task::spawn_blocking(move || {
    println!("Creating new backups");
    rt.block_on(async {
      let mut set = JoinSet::new();
      for (i, item) in backup_data.iter().enumerate() {
        let url = url.clone();
        let user = user_identities[i % user_identities.len()].clone();
        let item = item.clone();
        set.spawn(async move {
          create_new_backup::run(url, &user, &item).await.unwrap();
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
        let url = url.clone();
        let descriptor = BackupDescriptor::Latest {
          username: user.user_id.clone(),
        };
        handlers.push(tokio::spawn(async move {
          let response = pull_backup::run(
            url,
            descriptor,
            pull_backup::RequestedData::BackupID,
          )
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
        let url = url.clone();
        let descriptor = BackupDescriptor::Latest {
          username: user.user_id.clone(),
        };
        handlers.push(tokio::spawn(async move {
          pull_backup::run(
            url,
            descriptor,
            pull_backup::RequestedData::UserKeys,
          )
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
        let url = url.clone();
        let descriptor = BackupDescriptor::BackupID {
          backup_id: backup_id.clone(),
          user_identity: user_identities[i % user_identities.len()].clone(),
        };
        handlers.push(tokio::spawn(async move {
          pull_backup::run(
            url,
            descriptor,
            pull_backup::RequestedData::UserData,
          )
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
