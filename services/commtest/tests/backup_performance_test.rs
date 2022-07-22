#[path = "./backup/backup_utils.rs"]
mod backup_utils;
#[path = "./lib/tools.rs"]
mod tools;

use bytesize::ByteSize;

use tools::{obtain_number_of_threads, Error};

use backup_utils::{BackupData, Item};

#[tokio::test]
async fn backup_performance_test() -> Result<(), Error> {
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

  tokio::task::spawn_blocking(move || {
    // CREATE NEW BACKUP
    // SEND LOG
    // ADD ATTACHMENTS
    // PULL BACKUP
  })
  .await
  .expect("Task panicked");

  Ok(())
}
