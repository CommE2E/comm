#[path = "./backup_utils.rs"]
mod backup_utils;
#[path = "../lib/tools.rs"]
mod tools;

use crate::backup_utils::{proto::AddAttachmentsRequest, BackupServiceClient};

use tonic::Request;

use crate::backup_utils::BackupData;
// use crate::tools::generate_nbytes;
use crate::tools::{Error, ATTACHMENT_DELIMITER};

// logIndex = None means that we add attachments to the backup
// log_index = Some(x) means that we add attachments to a specific log
pub async fn run(
  client: &mut BackupServiceClient<tonic::transport::Channel>,
  backup_data: &BackupData,
  log_index: Option<usize>,
) -> Result<(), Error> {
  let cloned_user_id = backup_data.user_id.clone();
  let cloned_backup_id = backup_data.backup_item.id.clone();
  let log_id: String = match log_index {
    Some(index) => backup_data.log_items[index].id.clone(),
    None => String::new(),
  };
  if log_index != None {
    println!("add attachments for log {}/{}", log_index.unwrap(), log_id);
  } else {
    println!("add attachments for backup");
  }

  let attachments: String = match log_index {
    Some(log_index) => backup_data.log_items[log_index]
      .attachments_holders
      .join(&ATTACHMENT_DELIMITER.to_string()[..]),
    None => backup_data
      .backup_item
      .attachments_holders
      .join(&ATTACHMENT_DELIMITER.to_string()[..]),
  };

  client
    .add_attachments(Request::new(AddAttachmentsRequest {
      user_id: cloned_user_id,
      backup_id: cloned_backup_id,
      log_id: log_id,
      holders: attachments,
    }))
    .await?;
  Ok(())
}
