use chrono::{DateTime, NaiveDateTime, Utc};
use comm_lib::{
  aws::ddb::types::{AttributeValue, Put, TransactWriteItem},
  database::{AttributeExtractor, AttributeMap},
};
use std::collections::HashMap;
use std::iter::IntoIterator;

use crate::constants::{
  USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME, USERS_TABLE_USERNAME_ATTRIBUTE,
  USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
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
  match account_type {
    OlmAccountType::Content => format!("{user_id}#{device_id}#content"),
    OlmAccountType::Notification => {
      format!("{user_id}#{device_id}#notification")
    }
  }
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

  builder.set_item(Some(attrs)).build()
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

pub trait DateTimeExt {
  fn from_utc_timestamp_millis(timestamp: i64) -> Option<DateTime<Utc>>;
}

impl DateTimeExt for DateTime<Utc> {
  fn from_utc_timestamp_millis(timestamp: i64) -> Option<Self> {
    let naive = NaiveDateTime::from_timestamp_millis(timestamp)?;
    Some(Self::from_naive_utc_and_offset(naive, Utc))
  }
}

pub enum Identifier {
  Username(String),
  WalletAddress(EthereumIdentity),
}

pub struct EthereumIdentity {
  pub wallet_address: String,
  pub social_proof: String,
}

impl TryFrom<AttributeMap> for Identifier {
  type Error = crate::error::Error;

  fn try_from(mut value: AttributeMap) -> Result<Self, Self::Error> {
    let username_result = value.take_attr(USERS_TABLE_USERNAME_ATTRIBUTE);

    if let Ok(username) = username_result {
      return Ok(Identifier::Username(username));
    }

    let wallet_address_result =
      value.take_attr(USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE);
    let social_proof_result =
      value.take_attr(USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME);

    if let (Ok(wallet_address), Ok(social_proof)) =
      (wallet_address_result, social_proof_result)
    {
      Ok(Identifier::WalletAddress(EthereumIdentity {
        wallet_address,
        social_proof,
      }))
    } else {
      Err(Self::Error::MalformedItem)
    }
  }
}
