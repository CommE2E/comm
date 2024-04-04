use chrono::{DateTime, NaiveDateTime, Utc};
use comm_lib::{
  aws::ddb::types::{AttributeValue, PutRequest, WriteRequest},
  database::{AttributeExtractor, AttributeMap},
};
use std::collections::HashMap;
use std::iter::IntoIterator;

use crate::{
  constants::{
    USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME, USERS_TABLE_USERNAME_ATTRIBUTE,
    USERS_TABLE_WALLET_ADDRESS_ATTRIBUTE,
  },
  siwe::SocialProof,
};

#[derive(Copy, Clone, Debug)]
pub enum OlmAccountType {
  Content,
  Notification,
}

// Prefix the one time keys with the olm account variant. This allows for a single
// DDB table to contain both notification and content keys for a device.
pub fn create_one_time_key_partition_key(
  device_id: &str,
  account_type: OlmAccountType,
) -> String {
  match account_type {
    OlmAccountType::Content => format!("content_{device_id}"),
    OlmAccountType::Notification => format!("notification_{device_id}"),
  }
}

fn create_one_time_key_put_request(
  device_id: &str,
  one_time_key: String,
  account_type: OlmAccountType,
) -> WriteRequest {
  use crate::constants::one_time_keys_table::*;

  let partition_key =
    create_one_time_key_partition_key(device_id, account_type);
  let builder = PutRequest::builder();
  let attrs = HashMap::from([
    (PARTITION_KEY.to_string(), AttributeValue::S(partition_key)),
    (SORT_KEY.to_string(), AttributeValue::S(one_time_key)),
  ]);

  let put_request = builder.set_item(Some(attrs)).build();

  WriteRequest::builder().put_request(put_request).build()
}

pub fn into_one_time_put_requests<T>(
  device_id: &str,
  one_time_keys: T,
  account_type: OlmAccountType,
) -> Vec<WriteRequest>
where
  T: IntoIterator,
  <T as IntoIterator>::Item: ToString,
{
  one_time_keys
    .into_iter()
    .map(|otk| {
      create_one_time_key_put_request(device_id, otk.to_string(), account_type)
    })
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
  pub social_proof: SocialProof,
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
