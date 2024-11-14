pub mod backup_item;
pub mod log_item;

use self::{
  backup_item::{BackupItem, OrderedBackupItem},
  log_item::LogItem,
};
use crate::constants::{
  backup_table, error_types, log_table, LOG_DEFAULT_PAGE_SIZE,
};
use aws_sdk_dynamodb::{
  operation::get_item::GetItemOutput,
  types::{AttributeValue, DeleteRequest, ReturnValue, WriteRequest},
};
use comm_lib::{
  blob::client::BlobServiceClient,
  database::{
    self, batch_operations::ExponentialBackoffConfig, parse_int_attribute,
    Error,
  },
};
use tracing::{error, trace, warn};

#[derive(Clone)]
pub struct DatabaseClient {
  client: aws_sdk_dynamodb::Client,
}

impl DatabaseClient {
  pub fn new(aws_config: &aws_config::SdkConfig) -> Self {
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
        error!(
          errorType = error_types::DDB_ERROR,
          "DynamoDB client failed to put backup item"
        );
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
        error!(
          errorType = error_types::DDB_ERROR,
          "DynamoDB client failed to find backup item"
        );
        Error::AwsSdk(e.into())
      })?;

    let GetItemOutput {
      item: Some(item), ..
    } = output
    else {
      return Ok(None);
    };

    let backup_item = item.try_into()?;
    Ok(Some(backup_item))
  }

  pub async fn find_last_backup_item(
    &self,
    user_id: &str,
  ) -> Result<Option<OrderedBackupItem>, Error> {
    let mut found_backups =
      self.query_ordered_backups_index(user_id, Some(1)).await?;
    let latest_backup = found_backups.pop();
    Ok(latest_backup)
  }

  pub async fn remove_backup_item(
    &self,
    user_id: &str,
    backup_id: &str,
    blob_client: &BlobServiceClient,
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
        error!(
          errorType = error_types::DDB_ERROR,
          "DynamoDB client failed to remove backup item"
        );
        Error::AwsSdk(e.into())
      })?;

    let result = response
      .attributes
      .map(BackupItem::try_from)
      .transpose()
      .map_err(Error::from)?;

    if let Some(backup_item) = &result {
      backup_item.revoke_user_keys_holders(blob_client);
      backup_item.revoke_user_data_holders(blob_client);
    }

    self
      .remove_log_items_for_backup(user_id, backup_id, blob_client)
      .await?;

    Ok(result)
  }

  /// For the purposes of the initial backup version this function
  /// removes all backups except for the latest one
  pub async fn remove_old_backups(
    &self,
    user_id: &str,
    blob_client: &BlobServiceClient,
  ) -> Result<Vec<BackupItem>, Error> {
    let items = self.query_ordered_backups_index(user_id, None).await?;
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

      if let Some(backup) = self
        .remove_backup_item(user_id, &item.backup_id, blob_client)
        .await?
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
  pub async fn put_log_item(
    &self,
    log_item: LogItem,
    blob_client: &BlobServiceClient,
  ) -> Result<(), Error> {
    let item = log_item.into();

    let result = self
      .client
      .put_item()
      .table_name(log_table::TABLE_NAME)
      .set_item(Some(item))
      .return_values(ReturnValue::AllOld)
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::DDB_ERROR,
          "DynamoDB client failed to put log item"
        );
        Error::AwsSdk(e.into())
      })?;

    let Some(replaced_log_attrs) = result.attributes else {
      return Ok(());
    };

    let Ok(replaced_log) = LogItem::try_from(replaced_log_attrs) else {
      warn!("Couldn't parse replaced log item");
      return Ok(());
    };

    replaced_log.revoke_holders(blob_client);

    Ok(())
  }

  pub async fn fetch_log_items(
    &self,
    user_id: &str,
    backup_id: &str,
    from_id: Option<usize>,
  ) -> Result<(Vec<LogItem>, Option<usize>), Error> {
    let id = LogItem::partition_key(user_id, backup_id);
    let mut query = self
      .client
      .query()
      .table_name(log_table::TABLE_NAME)
      .key_condition_expression("#backupID = :valueToMatch")
      .expression_attribute_names("#backupID", log_table::attr::BACKUP_ID)
      .expression_attribute_values(
        ":valueToMatch",
        AttributeValue::S(id.clone()),
      )
      .limit(LOG_DEFAULT_PAGE_SIZE);

    if let Some(from_id) = from_id {
      query = query
        .exclusive_start_key(log_table::attr::BACKUP_ID, AttributeValue::S(id))
        .exclusive_start_key(
          log_table::attr::LOG_ID,
          AttributeValue::N(from_id.to_string()),
        );
    }

    let response = query.send().await.map_err(|e| {
      error!(
        errorType = error_types::DDB_ERROR,
        "DynamoDB client failed to fetch logs"
      );
      Error::AwsSdk(e.into())
    })?;

    let last_id = response
      .last_evaluated_key()
      .map(|key| {
        parse_int_attribute(
          log_table::attr::LOG_ID,
          key.get(log_table::attr::LOG_ID).cloned(),
        )
      })
      .transpose()?;

    let items = response
      .items
      .unwrap_or_default()
      .into_iter()
      .map(LogItem::try_from)
      .collect::<Result<Vec<_>, _>>()?;

    Ok((items, last_id))
  }

  pub async fn remove_log_items_for_backup(
    &self,
    user_id: &str,
    backup_id: &str,
    blob_client: &BlobServiceClient,
  ) -> Result<(), Error> {
    let (mut items, mut last_id) =
      self.fetch_log_items(user_id, backup_id, None).await?;
    while last_id.is_some() {
      let (mut new_items, new_last_id) =
        self.fetch_log_items(user_id, backup_id, last_id).await?;

      items.append(&mut new_items);
      last_id = new_last_id;
    }

    for log_item in &items {
      log_item.revoke_holders(blob_client);
    }

    let write_requests = items
      .into_iter()
      .map(|key| {
        DeleteRequest::builder()
          .set_key(Some(LogItem::item_key(user_id, key.backup_id, key.log_id)))
          .build()
          .expect("key not set in DeleteRequest builder")
      })
      .map(|request| WriteRequest::builder().delete_request(request).build())
      .collect::<Vec<_>>();

    database::batch_operations::batch_write(
      &self.client,
      log_table::TABLE_NAME,
      write_requests,
      ExponentialBackoffConfig::default(),
    )
    .await?;

    Ok(())
  }
}

// general functions
impl DatabaseClient {
  pub async fn delete_user_data(
    &self,
    user_id: &str,
    blob_client: &BlobServiceClient,
  ) -> Result<(), Error> {
    // query the index to avoid unnecessarily querying backup data
    let items = self.query_ordered_backups_index(user_id, None).await?;

    for item in items {
      trace!("Removing backup item: {item:?}");
      self
        .remove_backup_item(user_id, &item.backup_id, blob_client)
        .await?;
    }

    Ok(())
  }

  async fn query_ordered_backups_index(
    &self,
    user_id: &str,
    limit: Option<i32>,
  ) -> Result<Vec<OrderedBackupItem>, Error> {
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
      .set_limit(limit)
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = error_types::DDB_ERROR,
          "DynamoDB client failed to fetch backups"
        );
        Error::AwsSdk(e.into())
      })?;

    if response.last_evaluated_key().is_some() {
      // In the intial version of the backup service this function will be run
      // for every new backup (each user only has one backup), so this shouldn't
      // happen
      warn!("Not all backups have been retrieved from the index");
    }

    let items = response
      .items
      .unwrap_or_default()
      .into_iter()
      .map(OrderedBackupItem::try_from)
      .collect::<Result<Vec<_>, _>>()?;

    Ok(items)
  }
}
