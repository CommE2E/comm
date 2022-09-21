use bytesize::ByteSize;
use commtest::backup::{
  add_attachments,
  backup_utils::{self, BackupData, BackupServiceClient, Item},
  create_new_backup, pull_backup, send_log,
};
use commtest::tools::{self, Error};
use std::collections::HashMap;
use std::env;

#[tokio::test]
async fn backup_integration_test() -> Result<(), Error> {
  let port = env::var("COMM_SERVICES_PORT_BACKUP")
    .expect("port env var expected but not received");
  let mut client =
    BackupServiceClient::connect(format!("http://localhost:{}", port)).await?;

  let attachments_fill_size: u64 = 500;

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
  let mut attachments_size = 0;
  let mut i = backup_data.log_items[0].attachments_holders.len();
  let mut new_attachments: Vec<String> = Vec::new();
  while attachments_size < (attachments_fill_size as usize) {
    let att = format!("holder{}", i);
    attachments_size += att.len();
    new_attachments.push(att);
    i += 1;
  }

  let mut old_attachments =
    backup_data.log_items[0].attachments_holders.clone();
  backup_data.log_items[0].attachments_holders = new_attachments;
  add_attachments::run(&mut client, &backup_data, Some(0)).await?;
  backup_data.log_items[0]
    .attachments_holders
    .append(&mut old_attachments);
  let result = pull_backup::run(&mut client, &backup_data).await?;
  // check logs attachments
  // map<log_id, attachments size>
  let mut expected_log_map: HashMap<String, usize> = HashMap::new();
  let mut result_log_map: HashMap<String, usize> = HashMap::new();
  for i in 0..backup_data.log_items.len() {
    let expected: usize = backup_data.log_items[i].attachments_holders.len();
    expected_log_map.insert(backup_data.log_items[i].id.clone(), expected);
    let from_result: usize = result.log_items[i].attachments_holders.len();
    result_log_map.insert(result.log_items[i].id.clone(), from_result);
  }
  for (expected_id, expected_size) in &expected_log_map {
    let result_size = result_log_map.get(expected_id).expect(&format!(
      "comparing logs attachments: expected id found in result: {}",
      expected_id
    ));
    assert_eq!(
      expected_size, result_size,
      "comparing logs attachments, sizes don't match, backup {}",
      backup_data.backup_item.id
    );
  }

  Ok(())
}
