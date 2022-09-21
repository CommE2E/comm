pub mod proto {
  tonic::include_proto!("backup");
}
pub use proto::backup_service_client::BackupServiceClient;
use std::collections::HashMap;

// stands for both, backup and log items
#[derive(Clone)]
pub struct Item {
  pub id: String,
  pub chunks_sizes: Vec<usize>,
  pub attachments_holders: Vec<String>,
}

impl Item {
  pub fn new(
    id: String,
    chunks_sizes: Vec<usize>,
    attachments_holders: Vec<String>,
  ) -> Item {
    Item {
      id,
      chunks_sizes,
      attachments_holders,
    }
  }
}

#[derive(Clone)]
pub struct BackupData {
  pub user_id: String,
  pub device_id: String,
  pub backup_item: Item,
  pub log_items: Vec<Item>,
}

pub fn compare_backups(backup_data: &BackupData, result: &BackupData) {
  // check backup size
  let expected: usize = backup_data.backup_item.chunks_sizes.iter().sum();
  let from_result: usize = result.backup_item.chunks_sizes.iter().sum();
  assert_eq!(
    from_result, expected,
    "backup sizes do not match, expected {}, got {}",
    expected, from_result
  );

  // check backup attachments
  let expected: usize = backup_data.backup_item.attachments_holders.len();
  let from_result: usize = result.backup_item.attachments_holders.len();
  assert_eq!(
    from_result, expected,
    "backup: number of attachments holders do not match, expected {}, got {}",
    expected, from_result
  );

  // check number of logs
  let expected: usize = backup_data.log_items.len();
  let from_result: usize = result.log_items.len();
  assert_eq!(
    expected, from_result,
    "backup id {} number of logs do not match, expected {}, got {}",
    backup_data.backup_item.id, expected, from_result
  );

  // check log sizes
  // map<log_id, chunks_sizes>
  let mut expected_log_map: HashMap<String, usize> = HashMap::new();
  let mut result_log_map: HashMap<String, usize> = HashMap::new();
  for i in 0..backup_data.log_items.len() {
    let expected: usize = backup_data.log_items[i].chunks_sizes.iter().sum();
    let insert_result =
      expected_log_map.insert(backup_data.log_items[i].id.clone(), expected);
    assert_eq!(
      insert_result, None,
      "expected collection contained duplicated log id: {}",
      backup_data.log_items[i].id
    );
    let from_result: usize = result.log_items[i].chunks_sizes.iter().sum();
    let insert_result =
      result_log_map.insert(result.log_items[i].id.clone(), from_result);
    assert_eq!(
      insert_result, None,
      "expected collection contained duplicated log id: {}",
      result.log_items[i].id
    );
  }

  for (expected_id, expected_size) in &expected_log_map {
    let result_size = result_log_map.get(expected_id).expect(&format!(
      "comparing logs: expected id found in result: {}",
      expected_id
    ));
    assert_eq!(
      expected_size, result_size,
      "comparing logs, sizes don't match, backup {}",
      backup_data.backup_item.id
    );
  }

  // todo: check logs attachment holders
}
