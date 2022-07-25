#[path = "./backup/add_attachments.rs"]
mod add_attachments;
#[path = "./backup/backup_utils.rs"]
mod backup_utils;
#[path = "./backup/create_new_backup.rs"]
mod create_new_backup;
#[path = "./lib/tools.rs"]
mod tools;

use bytesize::ByteSize;
use std::env;
use std::sync::mpsc::channel;

use tokio::runtime::Runtime;
use tools::{obtain_number_of_threads, Error};

use backup_utils::{BackupData, BackupServiceClient, Item};

#[tokio::test]
async fn backup_performance_test() -> Result<(), Error> {
  let port = env::var("COMM_SERVICES_PORT_BACKUP")
    .expect("port env var expected but not received");
  let client =
    BackupServiceClient::connect(format!("http://localhost:{}", port)).await?;

  let number_of_threads = obtain_number_of_threads();

  println!(
    "Running performance tests for backup, number of threads: {}",
    number_of_threads
  );

  let mut backup_data = vec![];

  for i in 0..number_of_threads {
    backup_data.push(BackupData {
      user_id: format!("user{}", i),
      device_id: format!("device{}", i),
      backup_item: Item::new(
        String::new(),
        vec![ByteSize::mib(1).as_u64() as usize; 3 + (i % 5)],
        (0..(i % 5)).map(|x| format!("holder{}", x)).collect(),
      ),
      log_items: (0..(i % 4))
        .map(|x| {
          Item::new(
            String::new(),
            vec![ByteSize::mib(1).as_u64() as usize; 2 + (x % 2)],
            (0..(i % 5)).map(|x| format!("holder{}-{}", i, x)).collect(),
          )
        })
        .collect(),
    });
  }

  let rt = Runtime::new().unwrap();
  tokio::task::spawn_blocking(move || {
    // CREATE NEW BACKUP
    rt.block_on(async {
      println!("performing CREATE NEW BACKUP operations");
      let mut handlers = vec![];
      let (sender, receiver) = channel::<(usize, String)>();
      for (i, item) in backup_data.iter().enumerate() {
        let item_cloned = item.clone();
        let mut client_cloned = client.clone();
        let sender_cloned = sender.clone();
        handlers.push(tokio::spawn(async move {
          let id = create_new_backup::run(&mut client_cloned, &item_cloned)
            .await
            .unwrap();
          assert!(
            !id.is_empty(),
            "backup id should not be empty after creating a new backup"
          );
          sender_cloned.send((i, id)).unwrap();
        }));
      }
      drop(sender);

      for handler in handlers {
        handler.await.unwrap();
      }
      for data in receiver {
        println!("received: {:?}", data);
        let (index, id) = data;
        backup_data[index].backup_item.id = id;
      }
    });

    // check if backup IDs are properly set
    for (i, item) in backup_data.iter().enumerate() {
      assert!(
        !item.backup_item.id.is_empty(),
        "missing backup id for index {}",
        i
      );
    }

    // ADD ATTACHMENTS - BACKUPS
    rt.block_on(async {
      println!("performing ADD ATTACHMENTS - BACKUPS operations");
      let mut handlers = vec![];
      for item in backup_data {
        let item_cloned = item.clone();
        let mut client_cloned = client.clone();
        handlers.push(tokio::spawn(async move {
          if !item_cloned.backup_item.attachments_holders.is_empty() {
            add_attachments::run(&mut client_cloned, &item_cloned, None)
              .await
              .unwrap();
          }
        }));
      }

      for handler in handlers {
        handler.await.unwrap();
      }
    });

    // SEND LOG
    // ADD ATTACHMENTS
    // PULL BACKUP
  })
  .await
  .expect("Task panicked");

  Ok(())
}
