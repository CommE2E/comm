use tonic::Status;
use tracing::debug;

use super::handle_db_error;
use super::proto;
use crate::{
  constants::{ATTACHMENT_HOLDER_SEPARATOR, LOG_DATA_SIZE_DATABASE_LIMIT},
  database::{DatabaseClient, LogItem},
};

pub async fn handle_add_attachments(
  db: &DatabaseClient,
  request: proto::AddAttachmentsRequest,
) -> Result<(), Status> {
  let proto::AddAttachmentsRequest {
    user_id,
    backup_id,
    log_id,
    holders,
  } = request;

  if user_id.is_empty() {
    return Err(Status::invalid_argument(
      "user id required but not provided",
    ));
  }
  if backup_id.is_empty() {
    return Err(Status::invalid_argument(
      "backup id required but not provided",
    ));
  }
  if holders.is_empty() {
    return Err(Status::invalid_argument(
      "holders required but not provided",
    ));
  }

  if log_id.is_empty() {
    let backup_item_result = db
      .find_backup_item(&user_id, &backup_id)
      .await
      .map_err(handle_db_error)?;
    let mut backup_item = backup_item_result.ok_or_else(|| {
      debug!("Backup item not found");
      Status::not_found("Backup item not found")
    })?;

    add_new_attachments(&mut backup_item.attachment_holders, &holders);

    db.put_backup_item(backup_item)
      .await
      .map_err(handle_db_error)?;
  } else {
    let log_item_result = db
      .find_log_item(&backup_id, &log_id)
      .await
      .map_err(handle_db_error)?;
    let mut log_item = log_item_result.ok_or_else(|| {
      debug!("Log item not found");
      Status::not_found("Log item not found")
    })?;

    add_new_attachments(&mut log_item.attachment_holders, &holders);

    // log item too large for database, move it to blob-service stroage
    if !log_item.persisted_in_blob
      && log_item.total_size() > LOG_DATA_SIZE_DATABASE_LIMIT
    {
      debug!("Log item too large. Persisting in blob service...");
      log_item = move_to_blob(log_item).await?;
    }

    db.put_log_item(log_item).await.map_err(handle_db_error)?;
  }

  Ok(())
}

async fn move_to_blob(log_item: LogItem) -> Result<LogItem, Status> {
  todo!()
}

/// Modifies the [`current_holders_str`] by appending attachment holders
/// contained in [`new_holders`]. Removes duplicates. Both arguments
/// are expected to be [`ATTACHMENT_HOLDER_SEPARATOR`] separated strings.
fn add_new_attachments(current_holders_str: &mut String, new_holders: &str) {
  let mut current_holders = parse_attachment_holders(current_holders_str);

  let new_holders = parse_attachment_holders(new_holders);
  current_holders.extend(new_holders);

  *current_holders_str = current_holders
    .into_iter()
    .collect::<Vec<_>>()
    .join(ATTACHMENT_HOLDER_SEPARATOR);
}

/// Parses an [`ATTACHMENT_HOLDER_SEPARATOR`] separated string into a `HashSet`
/// of attachment holder string slices.
fn parse_attachment_holders(
  holders_str: &str,
) -> std::collections::HashSet<&str> {
  holders_str
    .split(ATTACHMENT_HOLDER_SEPARATOR)
    .filter(|holder| !holder.is_empty())
    .collect()
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::collections::HashSet;

  #[test]
  fn test_parse_attachments() {
    let holders = "h1;h2;h3";
    let expected = HashSet::from(["h1", "h2", "h3"]);
    assert_eq!(parse_attachment_holders(holders), expected);
  }

  #[test]
  fn test_empty_attachments() {
    let actual = parse_attachment_holders("");
    let expected = HashSet::new();
    assert_eq!(actual, expected);
  }

  #[test]
  fn test_add_attachments() {
    let mut current_holders = "holder1;holder2".to_string();
    let new_holders = "holder3;holder4";
    add_new_attachments(&mut current_holders, new_holders);
    assert_eq!(
      parse_attachment_holders(&current_holders),
      HashSet::from(["holder1", "holder2", "holder3", "holder4"])
    );
  }

  #[test]
  fn test_add_to_empty() {
    let mut current_holders = String::new();
    let new_holders = "holder3;holder4";
    add_new_attachments(&mut current_holders, new_holders);
    assert_eq!(
      parse_attachment_holders(&current_holders),
      HashSet::from(["holder3", "holder4"])
    );
  }

  #[test]
  fn test_add_none() {
    let mut current_holders = "holder1;holder2".to_string();
    let new_holders = "";
    add_new_attachments(&mut current_holders, new_holders);
    assert_eq!(
      parse_attachment_holders(&current_holders),
      HashSet::from(["holder1", "holder2"])
    );
  }

  #[test]
  fn test_remove_duplicates() {
    let mut current_holders = "holder1;holder2".to_string();
    let new_holders = "holder2;holder3";
    add_new_attachments(&mut current_holders, new_holders);
    assert_eq!(
      parse_attachment_holders(&current_holders),
      HashSet::from(["holder1", "holder2", "holder3"])
    );
  }
}
