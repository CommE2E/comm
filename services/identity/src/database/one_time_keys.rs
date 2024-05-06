use std::collections::HashSet;

use comm_lib::{
  aws::{
    ddb::types::{
      AttributeValue, Delete, DeleteRequest, TransactWriteItem, Update,
      WriteRequest,
    },
    DynamoDBError,
  },
  database::{
    batch_operations::{batch_write, ExponentialBackoffConfig},
    parse_int_attribute, AttributeExtractor, AttributeMap,
    DBItemAttributeError, DBItemError,
  },
};
use tracing::{debug, error, info};

use crate::{
  constants::{
    MAX_ONE_TIME_KEYS, ONE_TIME_KEY_UPLOAD_LIMIT_PER_ACCOUNT,
    OTK_DB_LOG_ERROR_TYPE,
  },
  database::DeviceIDAttribute,
  ddb_utils::{
    create_one_time_key_partition_key, into_one_time_put_requests,
    into_one_time_update_and_delete_requests, is_transaction_retryable,
    OlmAccountType,
  },
  error::{consume_error, Error},
  olm::is_valid_olm_key,
};

use super::DatabaseClient;

impl DatabaseClient {
  /// Gets the next one-time key for the account and then, in a transaction,
  /// deletes the key and updates the key count
  ///
  /// Returns the retrieved one-time key if it exists and a boolean indicating
  /// whether the `spawn_refresh_keys_task`` was called
  #[tracing::instrument(skip_all)]
  pub(super) async fn get_one_time_key(
    &self,
    user_id: &str,
    device_id: &str,
    account_type: OlmAccountType,
    can_request_more_keys: bool,
  ) -> Result<(Option<String>, bool), Error> {
    use crate::constants::devices_table;
    use crate::constants::retry;
    use crate::constants::ONE_TIME_KEY_MINIMUM_THRESHOLD;

    let attr_otk_count = match account_type {
      OlmAccountType::Content => devices_table::ATTR_CONTENT_OTK_COUNT,
      OlmAccountType::Notification => devices_table::ATTR_NOTIF_OTK_COUNT,
    };

    fn spawn_refresh_keys_task(device_id: &str) {
      // Clone the string slice to move into the async block
      let device_id = device_id.to_string();
      tokio::spawn(async move {
        debug!("Attempting to request more keys for device: {}", &device_id);
        let result =
          crate::tunnelbroker::send_refresh_keys_request(&device_id).await;
        consume_error(result);
      });
    }

    // TODO: Introduce `transact_write_helper` similar to `batch_write_helper`
    // in `comm-lib` to handle transactions with retries
    let mut attempt = 0;

    // TODO: Introduce nanny task that handles calling `spawn_refresh_keys_task`
    let mut requested_more_keys = false;

    loop {
      attempt += 1;
      if attempt > retry::MAX_ATTEMPTS {
        return Err(Error::MaxRetriesExceeded);
      }

      let otk_count =
        self.get_otk_count(user_id, device_id, account_type).await?;
      if otk_count < ONE_TIME_KEY_MINIMUM_THRESHOLD && can_request_more_keys {
        spawn_refresh_keys_task(device_id);
        requested_more_keys = true;
      }
      if otk_count < 1 {
        return Ok((None, requested_more_keys));
      }

      let Some(otk_row) = self
        .get_one_time_keys(user_id, device_id, account_type, Some(1))
        .await?
        .pop()
      else {
        return Err(Error::NotEnoughOneTimeKeys);
      };

      let delete_otk_operation = otk_row.as_delete_request();

      let update_otk_count = Update::builder()
        .table_name(devices_table::NAME)
        .key(
          devices_table::ATTR_USER_ID,
          AttributeValue::S(user_id.to_string()),
        )
        .key(
          devices_table::ATTR_ITEM_ID,
          DeviceIDAttribute(device_id.into()).into(),
        )
        .update_expression(format!("ADD {} :decrement_val", attr_otk_count))
        .expression_attribute_values(
          ":decrement_val",
          AttributeValue::N("-1".to_string()),
        )
        .condition_expression(format!("{} = :old_val", attr_otk_count))
        .expression_attribute_values(
          ":old_val",
          AttributeValue::N(otk_count.to_string()),
        )
        .build();

      let update_otk_count_operation = TransactWriteItem::builder()
        .update(update_otk_count)
        .build();

      let transaction = self
        .client
        .transact_write_items()
        .set_transact_items(Some(vec![
          delete_otk_operation,
          update_otk_count_operation,
        ]))
        .send()
        .await;

      match transaction {
        Ok(_) => return Ok((Some(otk_row.otk), requested_more_keys)),
        Err(e) => {
          let dynamo_db_error = DynamoDBError::from(e);
          let retryable_codes = HashSet::from([
            retry::CONDITIONAL_CHECK_FAILED,
            retry::TRANSACTION_CONFLICT,
          ]);
          if is_transaction_retryable(&dynamo_db_error, &retryable_codes) {
            info!("Encountered transaction conflict while retrieving one-time key - retrying");
          } else {
            error!(
              errorType = OTK_DB_LOG_ERROR_TYPE,
              "One-time key retrieval transaction failed: {:?}",
              dynamo_db_error
            );
            return Err(Error::AwsSdk(dynamo_db_error));
          }
        }
      }
    }
  }

  #[tracing::instrument(skip_all)]
  async fn get_one_time_keys(
    &self,
    user_id: &str,
    device_id: &str,
    account_type: OlmAccountType,
    num_keys: Option<usize>,
  ) -> Result<Vec<OTKRow>, Error> {
    use crate::constants::one_time_keys_table::*;

    let partition_key =
      create_one_time_key_partition_key(user_id, device_id, account_type);

    let mut query = self
      .client
      .query()
      .table_name(NAME)
      .key_condition_expression("#pk = :pk")
      .expression_attribute_names("#pk", PARTITION_KEY)
      .expression_attribute_values(":pk", AttributeValue::S(partition_key));

    if let Some(limit) = num_keys {
      // DynamoDB will reject the `query` request if `limit < 1`
      if limit < 1 {
        return Ok(Vec::new());
      }
      query = query.limit(limit as i32);
    }

    let otk_rows = query
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?
      .items
      .unwrap_or_default()
      .into_iter()
      .map(OTKRow::try_from)
      .collect::<Result<Vec<_>, _>>()
      .map_err(Error::from)?;

    if let Some(limit) = num_keys {
      if otk_rows.len() != limit {
        error!(
          errorType = OTK_DB_LOG_ERROR_TYPE,
          "There are fewer one-time keys than the number requested"
        );
        return Err(Error::NotEnoughOneTimeKeys);
      }
    }

    Ok(otk_rows)
  }

  #[tracing::instrument(skip_all)]
  pub async fn append_one_time_prekeys(
    &self,
    user_id: &str,
    device_id: &str,
    content_one_time_keys: &Vec<String>,
    notif_one_time_keys: &Vec<String>,
  ) -> Result<(), Error> {
    use crate::constants::retry;

    let num_content_keys_to_append = content_one_time_keys.len();
    let num_notif_keys_to_append = notif_one_time_keys.len();

    if num_content_keys_to_append > ONE_TIME_KEY_UPLOAD_LIMIT_PER_ACCOUNT
      || num_notif_keys_to_append > ONE_TIME_KEY_UPLOAD_LIMIT_PER_ACCOUNT
    {
      return Err(Error::OneTimeKeyUploadLimitExceeded);
    }

    if content_one_time_keys
      .iter()
      .any(|otk| !is_valid_olm_key(otk))
      || notif_one_time_keys.iter().any(|otk| !is_valid_olm_key(otk))
    {
      debug!("Invalid one-time key format");
      return Err(Error::InvalidFormat);
    }

    let current_time = chrono::Utc::now();

    let content_otk_requests = into_one_time_put_requests(
      user_id,
      device_id,
      content_one_time_keys,
      OlmAccountType::Content,
      current_time,
    );
    let notif_otk_requests = into_one_time_put_requests(
      user_id,
      device_id,
      notif_one_time_keys,
      OlmAccountType::Notification,
      current_time,
    );

    let current_content_otk_count = self
      .get_otk_count(user_id, device_id, OlmAccountType::Content)
      .await?;

    let current_notif_otk_count = self
      .get_otk_count(user_id, device_id, OlmAccountType::Notification)
      .await?;

    let num_content_keys_to_delete = (num_content_keys_to_append
      + current_content_otk_count)
      .saturating_sub(MAX_ONE_TIME_KEYS);

    let num_notif_keys_to_delete = (num_notif_keys_to_append
      + current_notif_otk_count)
      .saturating_sub(MAX_ONE_TIME_KEYS);

    let content_keys_to_delete = self
      .get_one_time_keys(
        user_id,
        device_id,
        OlmAccountType::Content,
        Some(num_content_keys_to_delete),
      )
      .await?;

    let notif_keys_to_delete = self
      .get_one_time_keys(
        user_id,
        device_id,
        OlmAccountType::Notification,
        Some(num_notif_keys_to_delete),
      )
      .await?;

    let update_and_delete_otk_count_operation =
      into_one_time_update_and_delete_requests(
        user_id,
        device_id,
        num_content_keys_to_append,
        num_notif_keys_to_append,
        content_keys_to_delete,
        notif_keys_to_delete,
      );

    let mut operations = Vec::new();
    operations.extend_from_slice(&content_otk_requests);
    operations.extend_from_slice(&notif_otk_requests);
    operations.extend_from_slice(&update_and_delete_otk_count_operation);

    // TODO: Introduce `transact_write_helper` similar to `batch_write_helper`
    // in `comm-lib` to handle transactions with retries
    let mut attempt = 0;

    loop {
      attempt += 1;
      if attempt > retry::MAX_ATTEMPTS {
        return Err(Error::MaxRetriesExceeded);
      }

      let transaction = self
        .client
        .transact_write_items()
        .set_transact_items(Some(operations.clone()))
        .send()
        .await;

      match transaction {
        Ok(_) => break,
        Err(e) => {
          let dynamo_db_error = DynamoDBError::from(e);
          let retryable_codes = HashSet::from([retry::TRANSACTION_CONFLICT]);
          if is_transaction_retryable(&dynamo_db_error, &retryable_codes) {
            info!("Encountered transaction conflict while uploading one-time keys - retrying");
          } else {
            error!(
              errorType = OTK_DB_LOG_ERROR_TYPE,
              "One-time key upload transaction failed: {:?}", dynamo_db_error
            );
            return Err(Error::AwsSdk(dynamo_db_error));
          }
        }
      }
    }

    Ok(())
  }

  #[tracing::instrument(skip_all)]
  async fn get_otk_count(
    &self,
    user_id: &str,
    device_id: &str,
    account_type: OlmAccountType,
  ) -> Result<usize, Error> {
    use crate::constants::devices_table;

    let attr_name = match account_type {
      OlmAccountType::Content => devices_table::ATTR_CONTENT_OTK_COUNT,
      OlmAccountType::Notification => devices_table::ATTR_NOTIF_OTK_COUNT,
    };

    let response = self
      .client
      .get_item()
      .table_name(devices_table::NAME)
      .projection_expression(attr_name)
      .key(
        devices_table::ATTR_USER_ID,
        AttributeValue::S(user_id.to_string()),
      )
      .key(
        devices_table::ATTR_ITEM_ID,
        DeviceIDAttribute(device_id.into()).into(),
      )
      .send()
      .await
      .map_err(|e| {
        error!(
          errorType = OTK_DB_LOG_ERROR_TYPE,
          "Failed to get user's OTK count: {:?}", e
        );
        Error::AwsSdk(e.into())
      })?;

    let mut user_item = response.item.unwrap_or_default();
    match parse_int_attribute(attr_name, user_item.remove(attr_name)) {
      Ok(num) => Ok(num),
      Err(DBItemError {
        attribute_error: DBItemAttributeError::Missing,
        ..
      }) => Ok(0),
      Err(e) => Err(Error::Attribute(e)),
    }
  }

  /// Deletes all data for a user's device from one-time keys table
  pub async fn delete_otks_table_rows_for_user_device(
    &self,
    user_id: &str,
    device_id: &str,
  ) -> Result<(), Error> {
    use crate::constants::one_time_keys_table::*;

    let content_otk_primary_keys = self
      .get_one_time_keys(user_id, device_id, OlmAccountType::Content, None)
      .await?;

    let notif_otk_primary_keys = self
      .get_one_time_keys(user_id, device_id, OlmAccountType::Notification, None)
      .await?;

    let delete_requests = content_otk_primary_keys
      .into_iter()
      .chain(notif_otk_primary_keys)
      .map(|otk_row| {
        let request = DeleteRequest::builder()
          .key(PARTITION_KEY, AttributeValue::S(otk_row.partition_key))
          .key(SORT_KEY, AttributeValue::S(otk_row.sort_key))
          .build();
        WriteRequest::builder().delete_request(request).build()
      })
      .collect::<Vec<_>>();

    batch_write(
      &self.client,
      NAME,
      delete_requests,
      ExponentialBackoffConfig::default(),
    )
    .await
    .map_err(Error::from)?;

    Ok(())
  }

  /// Deletes all data for a user from one-time keys table
  pub async fn delete_otks_table_rows_for_user(
    &self,
    user_id: &str,
  ) -> Result<(), Error> {
    let maybe_device_list_row = self.get_current_device_list(user_id).await?;
    let Some(device_list_row) = maybe_device_list_row else {
      info!("No devices associated with user. Skipping one-time key removal.");
      return Ok(());
    };

    for device_id in device_list_row.device_ids {
      self
        .delete_otks_table_rows_for_user_device(user_id, &device_id)
        .await?;
    }

    Ok(())
  }
}

pub struct OTKRow {
  pub partition_key: String,
  pub sort_key: String,
  pub otk: String,
}

impl OTKRow {
  pub fn as_delete_request(&self) -> TransactWriteItem {
    use crate::constants::one_time_keys_table as otk_table;

    let delete_otk = Delete::builder()
      .table_name(otk_table::NAME)
      .key(
        otk_table::PARTITION_KEY,
        AttributeValue::S(self.partition_key.to_string()),
      )
      .key(
        otk_table::SORT_KEY,
        AttributeValue::S(self.sort_key.to_string()),
      )
      .condition_expression("attribute_exists(#otk)")
      .expression_attribute_names("#otk", otk_table::ATTR_ONE_TIME_KEY)
      .build();

    TransactWriteItem::builder().delete(delete_otk).build()
  }
}

impl TryFrom<AttributeMap> for OTKRow {
  type Error = DBItemError;

  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    use crate::constants::one_time_keys_table as otk_table;

    let partition_key = attrs.take_attr(otk_table::PARTITION_KEY)?;
    let sort_key = attrs.take_attr(otk_table::SORT_KEY)?;
    let otk: String = attrs.take_attr(otk_table::ATTR_ONE_TIME_KEY)?;

    Ok(Self {
      partition_key,
      sort_key,
      otk,
    })
  }
}
