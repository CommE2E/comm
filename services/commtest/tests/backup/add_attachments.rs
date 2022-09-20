use crate::backup::backup_utils::{
  proto::AddAttachmentsRequest, BackupData, BackupServiceClient,
};
use crate::tools::{Error, ATTACHMENT_DELIMITER};
use tonic::Request;

// log_index = None means that we add attachments to the backup
// log_index = Some(x) means that we add attachments to a specific log
pub async fn run(
  client: &mut BackupServiceClient<tonic::transport::Channel>,
  backup_data: &BackupData,
  log_index: Option<usize>,
) -> Result<(), Error> {
  let cloned_user_id = backup_data.user_id.clone();
  let cloned_backup_id = backup_data.backup_item.id.clone();
  let log_id: String = match log_index {
    Some(index) => {
      let log_id = backup_data.log_items[index].id.clone();
      println!("add attachments for log {}/{}", index, log_id);
      log_id
    }
    None => {
      println!("add attachments for backup");
      String::new()
    }
  };

  let holders: String = match log_index {
    Some(log_index) => backup_data.log_items[log_index]
      .attachments_holders
      .join(ATTACHMENT_DELIMITER),
    None => backup_data
      .backup_item
      .attachments_holders
      .join(ATTACHMENT_DELIMITER),
  };

  client
    .add_attachments(Request::new(AddAttachmentsRequest {
      user_id: cloned_user_id,
      backup_id: cloned_backup_id,
      log_id,
      holders,
    }))
    .await?;
  Ok(())
}
