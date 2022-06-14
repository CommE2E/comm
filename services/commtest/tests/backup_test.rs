#[path = "./backup/add_attachments.rs"]
mod add_attachments;
#[path = "./backup/backup_utils.rs"]
mod backup_utils;
#[path = "./backup/create_new_backup.rs"]
mod create_new_backup;
#[path = "./backup/pull_backup.rs"]
mod pull_backup;
#[path = "./backup/send_log.rs"]
mod send_log;
#[path = "./lib/tools.rs"]
mod tools;

use backup_utils::{BackupData, Item};
use bytesize::ByteSize;
use tools::get_grpc_chunk_size_limit;
use tools::Error;

use backup_utils::BackupServiceClient;

#[tokio::test]
async fn backup_test() -> Result<(), Error> {
  let mut client =
    BackupServiceClient::connect("http://localhost:50052").await?;

  let mut backup_data = BackupData {
    user_id: "user0000".to_string(),
    device_id: "device0000".to_string(),
    backup_item: Item::new(
      String::new(),
      vec![ByteSize::mib(1).as_u64() as usize; 6],
      vec![
        "holder1".to_string(),
        "holder2".to_string(),
        "holder3".to_string(),
      ],
    ),
    log_items: vec![
      Item::new(String::new(), vec![100], vec!["holder1".to_string()]),
      Item::new(
        String::new(),
        vec![ByteSize::kb(400).as_u64() as usize],
        vec!["holder2".to_string(), "holder3".to_string()],
      ),
      Item::new(
        String::new(),
        vec![get_grpc_chunk_size_limit(), get_grpc_chunk_size_limit()],
        vec![
          "holder1".to_string(),
          "holder2".to_string(),
          "holder3".to_string(),
        ],
      ),
    ],
  };
  backup_data.backup_item.id =
    create_new_backup::run(&mut client, &backup_data).await?;
  println!("backup id in main: {}", backup_data.backup_item.id);

  add_attachments::run(&mut client, &backup_data, None).await?;

  for log_index in 0..backup_data.log_items.len() {
    backup_data.log_items[log_index].id =
      send_log::run(&mut client, &backup_data, log_index).await?;
    add_attachments::run(&mut client, &backup_data, Some(log_index)).await?;
  }

  let result = pull_backup::run(&mut client, &backup_data).await?;

  // check backup size
  let expected: usize = backup_data.backup_item.chunks_sizes.iter().sum();
  let from_result: usize = result.backup_item.chunks_sizes.iter().sum();
  assert!(
    from_result == expected,
    "backup sizes do not match, expected {}, got {}",
    expected,
    from_result
  );

  // check backup attachments
  let expected: usize = backup_data.backup_item.attachments_holders.len();
  let from_result: usize = result.backup_item.attachments_holders.len();
  assert!(
    from_result == expected,
    "backup: number of attachments holders do not match, expected {}, got {}",
    expected,
    from_result
  );

  // check number of logs
  let expected: usize = backup_data.log_items.len();
  let from_result: usize = result.log_items.len();
  assert!(
    expected == from_result,
    "number of logs do not match, expected {}, got {}",
    expected,
    from_result
  );

  // check log sizes
  for i in 0..backup_data.log_items.len() {
    let expected: usize = backup_data.log_items[i].chunks_sizes.iter().sum();
    let from_result: usize = result.log_items[i].chunks_sizes.iter().sum();
    assert!(
      from_result == expected,
      "log number {} sizes do not match, expected {}, got {}",
      i,
      expected,
      from_result
    );
  }
  // check logs attachments
  for i in 0..backup_data.log_items.len() {
    let expected: usize = backup_data.log_items[i].attachments_holders.len();
    let from_result: usize = result.log_items[i].attachments_holders.len();
    assert!(
      from_result == expected,
      "log {}: number of attachments holders do not match, expected {}, got {}",
      i,
      expected,
      from_result
    );
  }

  Ok(())
}
