pub mod proto {
  tonic::include_proto!("backup");
}

pub use proto::backup_service_client::BackupServiceClient;

// stands for both, backup and log items
#[allow(dead_code)]
#[derive(Clone)]
pub struct Item {
  pub id: String,
  pub chunks_sizes: Vec<usize>,
  pub attachments_holders: Vec<String>,
}

#[allow(dead_code)]
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

#[allow(dead_code)]
#[derive(Clone)]
pub struct BackupData {
  pub user_id: String,
  pub device_id: String,
  pub backup_item: Item,
  pub log_items: Vec<Item>,
}

#[allow(dead_code)]
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
    "number of logs do not match, expected {}, got {}",
    expected, from_result
  );

  // check log sizes
  for i in 0..backup_data.log_items.len() {
    let expected: usize = backup_data.log_items[i].chunks_sizes.iter().sum();
    let from_result: usize = result.log_items[i].chunks_sizes.iter().sum();
    assert_eq!(
      from_result, expected,
      "log number {} sizes do not match, expected {}, got {}",
      i, expected, from_result
    );
  }

  // todo: check logs attachment holders
}
