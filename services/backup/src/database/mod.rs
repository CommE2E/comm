pub mod backup_item;
pub mod log_item;

use self::{
  backup_item::{BackupItem, OrderedBackupItem},
  log_item::LogItem,
};
use crate::{
  constants::{backup_table, error_types, log_table, LOG_DEFAULT_PAGE_SIZE},
  CONFIG,
};
use aws_sdk_dynamodb::{
  operation::get_item::GetItemOutput,
  types::{
    AttributeValue, DeleteRequest, PutRequest, ReturnValue, WriteRequest,
  },
};
use comm_lib::{
  blob::{client::BlobServiceClient, types::BlobInfo},
  database::{
    self, batch_operations::ExponentialBackoffConfig, parse_int_attribute,
    AttributeMap, Error,
  },
  tools::Defer,
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
    let mut removed_backups = vec![];

    if !CONFIG.remove_old_backups {
      return Ok(removed_backups);
    }

    let items = self.query_ordered_backups_index(user_id, None).await?;
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

  /// Utility internal function to fetch a page of log DDB items
  /// without further processing them.
  async fn fetch_raw_log_items(
    &self,
    user_id: &str,
    backup_id: &str,
    projection_expression: Option<&String>,
    from_id: Option<usize>,
    limit: Option<i32>,
  ) -> Result<(Vec<AttributeMap>, Option<usize>), Error> {
    let id = LogItem::partition_key(user_id, backup_id);
    let mut query = self
      .client
      .query()
      .table_name(log_table::TABLE_NAME)
      .set_projection_expression(projection_expression.cloned())
      .key_condition_expression("#backupID = :valueToMatch")
      .expression_attribute_names("#backupID", log_table::attr::BACKUP_ID)
      .expression_attribute_values(
        ":valueToMatch",
        AttributeValue::S(id.clone()),
      )
      .set_limit(limit);

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

    let items = response.items.unwrap_or_default();
    Ok((items, last_id))
  }

  /// Fetches single page of log items, starting from [`from_id`].
  /// Pare size is [`LOG_DEFAULT_PAGE_SIZE`].
  /// Returns log items and ID of last processed ID which can be passed
  /// to the [`from_id`] argument of a subsequent call.
  pub async fn fetch_log_items(
    &self,
    user_id: &str,
    backup_id: &str,
    from_id: Option<usize>,
  ) -> Result<(Vec<LogItem>, Option<usize>), Error> {
    let (raw_items, last_id) = self
      .fetch_raw_log_items(
        user_id,
        backup_id,
        None,
        from_id,
        Some(LOG_DEFAULT_PAGE_SIZE),
      )
      .await?;

    let items = raw_items
      .into_iter()
      .map(LogItem::try_from)
      .collect::<Result<Vec<_>, _>>()?;

    Ok((items, last_id))
  }

  /// Fetches all log items for given backup.
  pub async fn fetch_all_log_items_for_backup(
    &self,
    user_id: &str,
    backup_id: &str,
  ) -> Result<Vec<LogItem>, Error> {
    let (mut raw_items, mut last_id) = (Vec::new(), None);
    while {
      let (new_items, new_last_id) = self
        .fetch_raw_log_items(user_id, backup_id, None, last_id, None)
        .await?;

      raw_items.extend(new_items);
      last_id = new_last_id;
      last_id.is_some()
    } {}

    let items = raw_items
      .into_iter()
      .map(LogItem::try_from)
      .collect::<Result<Vec<_>, _>>()?;
    Ok(items)
  }

  pub async fn get_blob_infos_and_size_for_logs(
    &self,
    user_id: &str,
    backup_id: &str,
  ) -> Result<(Vec<BlobInfo>, u64), Error> {
    let mut blob_infos = Vec::new();
    let mut logs_ddb_size = 0u64;

    let log_items = self
      .fetch_all_log_items_for_backup(user_id, backup_id)
      .await?;

    use comm_lib::database::blob::BlobOrDBContent as LogContent;
    for log in log_items {
      match log.content {
        LogContent::Blob(blob_info) => blob_infos.push(blob_info),
        LogContent::Database(db_content) => {
          logs_ddb_size += db_content.len() as u64;
        }
      }

      blob_infos.extend(log.attachments);
    }

    Ok((blob_infos, logs_ddb_size))
  }

  pub async fn remove_log_items_for_backup(
    &self,
    user_id: &str,
    backup_id: &str,
    blob_client: &BlobServiceClient,
  ) -> Result<(), Error> {
    let items = self
      .fetch_all_log_items_for_backup(user_id, backup_id)
      .await?;

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

  /// Copies all log items from [`old_backup_id`] to [`new_backup_id`].
  /// Assigns new holders to all logs' [`BlobInfo`]s, and returns
  /// a [`Defer'] revoke object that removes these holders unless canceled.
  #[must_use = "Holders will be discarded unless returned revoke is canceled"]
  pub async fn copy_log_items_to_new_backup<'revoke, 'blob: 'revoke>(
    &self,
    user_id: &str,
    old_backup_id: &str,
    new_backup_id: &str,
    blob_client: &'blob BlobServiceClient,
  ) -> Result<Defer<'revoke>, crate::error::BackupError> {
    // 0. Fetch logs for old backup
    let mut items = self
      .fetch_all_log_items_for_backup(user_id, old_backup_id)
      .await?;

    // 1. Update backup ID, create new random holders for blobs
    for log_item in &mut items {
      log_item.reassign_backup_id_and_holders(new_backup_id.to_string());
    }

    // 2. Assign new holders on Blob service
    let blob_infos: Vec<BlobInfo> =
      items.iter().flat_map(LogItem::blob_infos).collect();
    let assigned_holder_infos = blob_client
      .assign_multiple_holders_with_retries(blob_infos, Default::default())
      .await?;

    let revoke = Defer::new(|| {
      for BlobInfo { blob_hash, holder } in assigned_holder_infos {
        blob_client.schedule_revoke_holder(blob_hash, holder);
      }
    });

    // 3. Store new logs in DDB
    let write_requests = items
      .into_iter()
      .map(|log_item| {
        let put_request = PutRequest::builder()
          .set_item(Some(log_item.into()))
          .build()
          .expect("item not set in PutRequest builder");
        WriteRequest::builder().put_request(put_request).build()
      })
      .collect::<Vec<_>>();

    database::batch_operations::batch_write(
      &self.client,
      log_table::TABLE_NAME,
      write_requests,
      ExponentialBackoffConfig::default(),
    )
    .await?;

    Ok(revoke)
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
    let query = self
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
      .scan_index_forward(false);

    let mut raw_items = Vec::new();
    let mut cursor = None;
    loop {
      let new_limit = limit
        .map(|it| it - raw_items.len() as i32)
        .filter(|it| *it > 0);
      let request = query
        .clone()
        .set_exclusive_start_key(cursor)
        .set_limit(new_limit);
      let response = request.send().await.map_err(|e| {
        error!(
          errorType = error_types::DDB_ERROR,
          "DynamoDB client failed to fetch backups"
        );
        Error::AwsSdk(e.into())
      })?;

      raw_items.extend(response.items.unwrap_or_default());
      let limit_reached = limit.is_some_and(|it| raw_items.len() as i32 >= it);

      cursor = match response.last_evaluated_key {
        key @ Some(_) if !limit_reached => key,
        _ => break,
      };
    }

    let items = raw_items
      .into_iter()
      .map(OrderedBackupItem::try_from)
      .collect::<Result<Vec<_>, _>>()?;

    Ok(items)
  }
}
