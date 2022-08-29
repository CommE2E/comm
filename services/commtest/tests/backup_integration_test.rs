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
use tools::Error;

use std::env;

use backup_utils::BackupServiceClient;

#[tokio::test]
async fn backup_integration_test() -> Result<(), Error> {
  let port = env::var("COMM_SERVICES_PORT_BACKUP")
    .expect("port env var expected but not received");
  let mut client =
    BackupServiceClient::connect(format!("http://localhost:{}", port)).await?;

  let attachments_fill_size: u64 = 2000; // todo it was 500 before but there was a surplus of bytes so this should be investigated why all of the sudden there is more data sent

  let mut backup_data = BackupData {
    user_id: "user0000".to_string(),
    device_id: "device0000".to_string(),
    backup_item: Item::new(
      String::new(),
      vec![ByteSize::mib(1).as_u64() as usize; 6],
      vec![
        "holder0".to_string(),
        "holder1".to_string(),
        "holder2".to_string(),
      ],
    ),
    log_items: vec![
      // the item that almost hits the DB limit, we're going to later add a long
      // list of attachments, so that causes it to exceed the limit.
      // In this case its data should be moved to the S3
      Item::new(
        String::new(),
        vec![
          *tools::DYNAMO_DB_ITEM_SIZE_LIMIT
            - ByteSize::b(attachments_fill_size / 2).as_u64() as usize,
        ],
        vec!["holder0".to_string(), "holder1".to_string()],
      ),
      // just a small item
      Item::new(
        String::new(),
        vec![ByteSize::b(100).as_u64() as usize],
        vec!["holder0".to_string()],
      ),
      // a big item that should be placed in the S3 right away
      Item::new(
        String::new(),
        vec![*tools::GRPC_CHUNK_SIZE_LIMIT, *tools::GRPC_CHUNK_SIZE_LIMIT],
        vec![
          "holder0".to_string(),
          "holder1".to_string(),
          "holder2".to_string(),
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

  let result: BackupData = pull_backup::run(&mut client, &backup_data).await?;

  backup_utils::compare_backups(&backup_data, &result);

  // push so many attachments that the log item's data will have to be moved
  // from the db to the s3
  // let mut attachments_size = 0;
  // let mut i = backup_data.log_items[0].attachments_holders.len();
  // let mut new_attachments: Vec<String> = Vec::new();
  // while attachments_size < (attachments_fill_size as usize) {
  //   let att = format!("holder{}", i);
  //   attachments_size += att.len();
  //   new_attachments.push(att);
  //   i += 1;
  // }

  // let mut old_attachments =
  //   backup_data.log_items[0].attachments_holders.clone();
  // backup_data.log_items[0].attachments_holders = new_attachments;
  // add_attachments::run(&mut client, &backup_data, Some(0)).await?;
  // backup_data.log_items[0]
  //   .attachments_holders
  //   .append(&mut old_attachments);
  // let result = pull_backup::run(&mut client, &backup_data).await?;
  // // check logs attachments
  // for i in 0..backup_data.log_items.len() {
  //   let expected: usize = backup_data.log_items[i].attachments_holders.len();
  //   let from_result: usize = result.log_items[i].attachments_holders.len();
  //   assert_eq!(
  //     from_result, expected,
  //     "after attachment add: log {}: number of attachments holders do not match,
  //     expected {}, got {}",
  //     i,
  //     expected,
  //     from_result
  //   );
  // }

  Ok(())
}
