pub mod backup_item;
pub mod log_item;

use self::{
  backup_item::{BackupItem, OrderedBackupItem},
  log_item::LogItem,
};
use crate::constants::{backup_table, log_table};
use aws_sdk_dynamodb::{
  operation::get_item::GetItemOutput,
  types::{AttributeValue, ReturnValue},
};
use comm_lib::database::Error;
use tracing::{error, trace, warn};

#[derive(Clone)]
pub struct DatabaseClient {
  client: aws_sdk_dynamodb::Client,
}

impl DatabaseClient {
  pub fn new(aws_config: &aws_types::SdkConfig) -> Self {
    DatabaseClient {
      client: aws_sdk_dynamodb::Client::new(aws_config),
    }
  }
}

/// Backup functions
impl DatabaseClient {
  pub async fn put_backup_item(
    &self,
    backup_item: BackupItem,
  ) -> Result<(), Error> {
    let item = backup_item.into();

    self
      .client
      .put_item()
      .table_name(backup_table::TABLE_NAME)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to put backup item");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn find_backup_item(
    &self,
    user_id: &str,
    backup_id: &str,
  ) -> Result<Option<BackupItem>, Error> {
    let item_key = BackupItem::item_key(user_id, backup_id);

    let output = self
      .client
      .get_item()
      .table_name(backup_table::TABLE_NAME)
      .set_key(Some(item_key))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find backup item");
        Error::AwsSdk(e.into())
      })?;

    let GetItemOutput {
      item: Some(item), ..
    } = output else {
      return Ok(None)
    };

    let backup_item = item.try_into()?;
    Ok(Some(backup_item))
  }

  pub async fn find_last_backup_item(
    &self,
    user_id: &str,
  ) -> Result<Option<OrderedBackupItem>, Error> {
    let response = self
      .client
      .query()
      .table_name(backup_table::TABLE_NAME)
      .index_name(backup_table::CREATED_INDEX)
      .key_condition_expression("#userID = :valueToMatch")
      .expression_attribute_names("#userID", backup_table::attr::USER_ID)
      .expression_attribute_values(
        ":valueToMatch",
        AttributeValue::S(user_id.to_string()),
      )
      .limit(1)
      .scan_index_forward(false)
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find last backup");
        Error::AwsSdk(e.into())
      })?;

    match response.items.unwrap_or_default().pop() {
      Some(item) => {
        let backup_item = item.try_into()?;
        Ok(Some(backup_item))
      }
      None => Ok(None),
    }
  }

  pub async fn remove_backup_item(
    &self,
    user_id: &str,
    backup_id: &str,
  ) -> Result<Option<BackupItem>, Error> {
    let item_key = BackupItem::item_key(user_id, backup_id);

    let response = self
      .client
      .delete_item()
      .table_name(backup_table::TABLE_NAME)
      .set_key(Some(item_key))
      .return_values(ReturnValue::AllOld)
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to remove backup item");
        Error::AwsSdk(e.into())
      })?;

    response
      .attributes
      .map(BackupItem::try_from)
      .transpose()
      .map_err(Error::from)
  }

  /// For the purposes of the initial backup version this function
  /// removes all backups except for the latest one
  pub async fn remove_old_backups(
    &self,
    user_id: &str,
  ) -> Result<Vec<BackupItem>, Error> {
    let response = self
      .client
      .query()
      .table_name(backup_table::TABLE_NAME)
      .index_name(backup_table::CREATED_INDEX)
      .key_condition_expression("#userID = :valueToMatch")
      .expression_attribute_names("#userID", backup_table::attr::USER_ID)
      .expression_attribute_values(
        ":valueToMatch",
        AttributeValue::S(user_id.to_string()),
      )
      .scan_index_forward(false)
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to fetch backups");
        Error::AwsSdk(e.into())
      })?;

    if response.last_evaluated_key().is_some() {
      // In the intial version of the backup service this function will be run
      // for every new backup (each user only has one backup), so this shouldn't
      // happen
      warn!("Not all old backups have been cleaned up");
    }

    let items = response
      .items
      .unwrap_or_default()
      .into_iter()
      .map(OrderedBackupItem::try_from)
      .collect::<Result<Vec<_>, _>>()?;

    let mut removed_backups = vec![];

    let Some(latest) = items.iter().map(|item| item.created).max() else {
      return Ok(removed_backups);
    };

    for item in items {
      if item.created == latest {
        trace!(
          "Skipping removal of the latest backup item: {}",
          item.backup_id
        );
        continue;
      }

      trace!("Removing backup item: {item:?}");

      if let Some(backup) =
        self.remove_backup_item(user_id, &item.backup_id).await?
      {
        removed_backups.push(backup);
      } else {
        warn!("Backup was found during query, but wasn't found when deleting")
      };
    }

    Ok(removed_backups)
  }
}

/// Backup log functions
impl DatabaseClient {
  pub async fn put_log_item(&self, log_item: LogItem) -> Result<(), Error> {
    let item = log_item.into();

    self
      .client
      .put_item()
      .table_name(log_table::TABLE_NAME)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to put log item");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }
}
