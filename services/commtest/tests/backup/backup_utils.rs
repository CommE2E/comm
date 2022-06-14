pub mod proto {
  tonic::include_proto!("backup");
}

pub use proto::backup_service_client::BackupServiceClient;

// stands for both, backup and log items
#[allow(dead_code)]
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
      id: id,
      chunks_sizes: chunks_sizes,
      attachments_holders: attachments_holders,
    }
  }
}

#[allow(dead_code)]
pub struct BackupData {
  pub user_id: String,
  pub device_id: String,
  pub backup_item: Item,
  pub log_items: Vec<Item>,
}
