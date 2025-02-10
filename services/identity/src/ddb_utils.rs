use chrono::{DateTime, Utc};
use comm_lib::{
  aws::ddb::types::{AttributeValue, Put, TransactWriteItem, Update},
  database::{AttributeExtractor, AttributeMap},
};
use std::collections::HashMap;
use std::iter::IntoIterator;

use crate::{
  constants::{
    USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME,
    USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME, USERS_TABLE_USERNAME_ATTRIBUTE,
    USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
  },
  database::{DeviceIDAttribute, OTKRow},
  siwe::SocialProof,
};

pub use comm_lib::database::{
  is_transaction_conflict, is_transaction_retryable,
};

#[derive(Copy, Clone, Debug)]
pub enum OlmAccountType {
  Content,
  Notification,
}

pub fn create_one_time_key_partition_key(
  user_id: &str,
  device_id: &str,
  account_type: OlmAccountType,
) -> String {
  let account_type = match account_type {
    OlmAccountType::Content => "content",
    OlmAccountType::Notification => "notif",
  };
  format!("{user_id}#{device_id}#{account_type}")
}

fn create_one_time_key_sort_key(
  key_number: usize,
  current_time: DateTime<Utc>,
) -> String {
  let timestamp = current_time.to_rfc3339();
  format!("{timestamp}#{:02}", key_number)
}

fn create_one_time_key_put_request(
  user_id: &str,
  device_id: &str,
  one_time_key: String,
  key_number: usize,
  account_type: OlmAccountType,
  current_time: DateTime<Utc>,
) -> Put {
  use crate::constants::one_time_keys_table::*;

  let partition_key =
    create_one_time_key_partition_key(user_id, device_id, account_type);
  let sort_key = create_one_time_key_sort_key(key_number, current_time);

  let builder = Put::builder();
  let attrs = HashMap::from([
    (PARTITION_KEY.to_string(), AttributeValue::S(partition_key)),
    (SORT_KEY.to_string(), AttributeValue::S(sort_key)),
    (
      ATTR_ONE_TIME_KEY.to_string(),
      AttributeValue::S(one_time_key),
    ),
  ]);

  builder
    .table_name(NAME)
    .set_item(Some(attrs))
    .build()
    .expect("table name not set in PutBuilder")
}

pub fn into_one_time_put_requests<T>(
  user_id: &str,
  device_id: &str,
  one_time_keys: T,
  account_type: OlmAccountType,
  current_time: DateTime<Utc>,
) -> Vec<TransactWriteItem>
where
  T: IntoIterator,
  <T as IntoIterator>::Item: ToString,
{
  one_time_keys
    .into_iter()
    .enumerate()
    .map(|(index, otk)| {
      create_one_time_key_put_request(
        user_id,
        device_id,
        otk.to_string(),
        index,
        account_type,
        current_time,
      )
    })
    .map(|put_request| TransactWriteItem::builder().put(put_request).build())
    .collect()
}

pub fn into_one_time_update_and_delete_requests(
  user_id: &str,
  device_id: &str,
  num_content_keys_to_append: usize,
  num_notif_keys_to_append: usize,
  content_keys_to_delete: Vec<OTKRow>,
  notif_keys_to_delete: Vec<OTKRow>,
) -> Vec<TransactWriteItem> {
  use crate::constants::devices_table;

  let mut transactions = Vec::new();

  for otk_row in content_keys_to_delete.iter().chain(&notif_keys_to_delete) {
    let delete_otk_operation = otk_row.as_delete_request();
    transactions.push(delete_otk_operation)
  }

  let content_key_count_delta =
    num_content_keys_to_append - content_keys_to_delete.len();

  let notif_key_count_delta =
    num_notif_keys_to_append - notif_keys_to_delete.len();

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
    .update_expression(format!(
      "ADD {} :num_content, {} :num_notif",
      devices_table::ATTR_CONTENT_OTK_COUNT,
      devices_table::ATTR_NOTIF_OTK_COUNT
    ))
    .expression_attribute_values(
      ":num_content",
      AttributeValue::N(content_key_count_delta.to_string()),
    )
    .expression_attribute_values(
      ":num_notif",
      AttributeValue::N(notif_key_count_delta.to_string()),
    )
    .build()
    .expect("key, update_expression or table_name not set in Update builder");

  let update_otk_count_operation = TransactWriteItem::builder()
    .update(update_otk_count)
    .build();

  transactions.push(update_otk_count_operation);

  transactions
}

pub struct DBIdentity {
  pub identifier: Identifier,
  pub farcaster_id: Option<String>,
}

pub enum Identifier {
  Username(String),
  WalletAddress(EthereumIdentity),
}

impl Identifier {
  pub fn username(&self) -> &str {
    match self {
      Identifier::Username(username) => username,
      Identifier::WalletAddress(eth_identity) => &eth_identity.wallet_address,
    }
  }
}

#[derive(Clone)]
pub struct EthereumIdentity {
  pub wallet_address: String,
  pub social_proof: SocialProof,
}

impl TryFrom<AttributeMap> for DBIdentity {
  type Error = crate::error::Error;

  fn try_from(mut value: AttributeMap) -> Result<Self, Self::Error> {
    let farcaster_id =
      value.take_attr(USERS_TABLE_FARCASTER_ID_ATTRIBUTE_NAME)?;

    let username_result = value.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE);

    if let Ok(username) = username_result {
      return Ok(DBIdentity {
        identifier: Identifier::Username(username),
        farcaster_id,
      });
    }

    let wallet_address_result =
      value.take_attr(USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE);
    let social_proof_result =
      value.take_attr(USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME);

    if let (Ok(wallet_address), Ok(social_proof)) =
      (wallet_address_result, social_proof_result)
    {
      Ok(DBIdentity {
        identifier: Identifier::WalletAddress(EthereumIdentity {
          wallet_address,
          social_proof,
        }),
        farcaster_id,
      })
    } else {
      Err(Self::Error::MalformedItem)
    }
  }
}

#[cfg(test)]
mod tests {
  use crate::constants::one_time_keys_table;

  use super::*;

  #[test]
  fn test_into_one_time_put_requests() {
    let otks = ["not", "real", "keys"];
    let current_time = Utc::now();

    let requests = into_one_time_put_requests(
      "abc",
      "123",
      otks,
      OlmAccountType::Content,
      current_time,
    );

    assert_eq!(requests.len(), 3);

    for (index, request) in requests.into_iter().enumerate() {
      let mut item = request.put.unwrap().item;
      assert_eq!(
        item.remove(one_time_keys_table::PARTITION_KEY).unwrap(),
        AttributeValue::S("abc#123#content".to_string())
      );
      assert_eq!(
        item.remove(one_time_keys_table::SORT_KEY).unwrap(),
        AttributeValue::S(format!(
          "{}#{:02}",
          current_time.to_rfc3339(),
          index
        ))
      );
      assert_eq!(
        item.remove(one_time_keys_table::ATTR_ONE_TIME_KEY).unwrap(),
        AttributeValue::S(otks[index].to_string())
      );
    }
  }
}
