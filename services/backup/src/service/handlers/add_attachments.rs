use tonic::Status;

use super::proto;
use crate::{constants::ATTACHMENT_HOLDER_SEPARATOR, database::DatabaseClient};

pub async fn handle_add_attachments(
  db: &DatabaseClient,
  request: proto::AddAttachmentsRequest,
) -> Result<(), Status> {
  unimplemented!()
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
