mod backup;
mod tools;

use backup::{
  add_attachments,
  backup_utils::{self, BackupData, BackupServiceClient, Item},
  create_new_backup, pull_backup, send_log,
};
use bytesize::ByteSize;
use std::env;
use std::sync::mpsc::channel;
use tokio::runtime::Runtime;
use tools::{obtain_number_of_threads, Error};

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
      // https://docs.rs/tokio/1.1.0/tokio/sync/mpsc/struct.Receiver.html#method.recv
      // The channel is closed when all senders have been dropped, or when close
      // is called. The best option here is to clone the sender for every
      // thread, drop the original one and let all the clones be dropped when
      // going out of scope which is equal to the parent thread's termination.
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
      for item in &backup_data {
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
    rt.block_on(async {
      println!("performing SEND LOG operations");
      let mut handlers = vec![];
      let (sender, receiver) = channel::<(usize, usize, String)>();
      for (backup_index, backup_item) in backup_data.iter().enumerate() {
        let backup_item_cloned = backup_item.clone();
        for log_index in 0..backup_item_cloned.log_items.len() {
          let backup_item_recloned = backup_item_cloned.clone();
          let mut client_cloned = client.clone();
          let sender_cloned = sender.clone();
          handlers.push(tokio::spawn(async move {
            println!(
              "sending log, backup index: [{}] log index: [{}]",
              backup_index, log_index
            );
            let id = send_log::run(
              &mut client_cloned,
              &backup_item_recloned,
              log_index,
            )
            .await
            .unwrap();
            assert!(!id.is_empty(), "log id should not be empty after sending");
            sender_cloned.send((backup_index, log_index, id)).unwrap();
          }));
        }
      }
      // https://docs.rs/tokio/1.1.0/tokio/sync/mpsc/struct.Receiver.html#method.recv
      // The channel is closed when all senders have been dropped, or when close
      // is called. The best option here is to clone the sender for every
      // thread, drop the original one and let all the clones be dropped when
      // going out of scope which is equal to the parent thread's termination.
      drop(sender);

      for handler in handlers {
        handler.await.unwrap();
      }
      for data in receiver {
        println!("received: {:?}", data);
        let (backup_index, log_index, id) = data;
        backup_data[backup_index].log_items[log_index].id = id;
      }
    });

    // check if log IDs are properly set
    for (backup_index, backup_item) in backup_data.iter().enumerate() {
      for (log_index, log_item) in backup_item.log_items.iter().enumerate() {
        assert!(
          !log_item.id.is_empty(),
          "missing log id for backup index {} and log index {}",
          backup_index,
          log_index
        );
      }
    }

    // ADD ATTACHMENTS - LOGS
    rt.block_on(async {
      println!("performing ADD ATTACHMENTS - LOGS operations");
      let mut handlers = vec![];
      for backup_item in &backup_data {
        let backup_item_cloned = backup_item.clone();
        for log_index in 0..backup_item_cloned.log_items.len() {
          let backup_item_recloned = backup_item_cloned.clone();
          let mut client_cloned = client.clone();
          handlers.push(tokio::spawn(async move {
            if !backup_item_recloned
              .backup_item
              .attachments_holders
              .is_empty()
            {
              add_attachments::run(
                &mut client_cloned,
                &backup_item_recloned,
                Some(log_index),
              )
              .await
              .unwrap();
            }
          }));
        }
      }

      for handler in handlers {
        handler.await.unwrap();
      }
    });

    // PULL BACKUP
    rt.block_on(async {
      println!("performing PULL BACKUP operations");
      let mut handlers = vec![];
      for item in backup_data {
        let item_cloned = item.clone();
        let mut client_cloned = client.clone();
        handlers.push(tokio::spawn(async move {
          let result = pull_backup::run(&mut client_cloned, &item_cloned)
            .await
            .unwrap();
          backup_utils::compare_backups(&item_cloned, &result);
        }));
      }

      for handler in handlers {
        handler.await.unwrap();
      }
    });
  })
  .await
  .expect("Task panicked");

  Ok(())
}
