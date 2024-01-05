use chrono::{DateTime, NaiveDateTime, Utc};
use comm_lib::{
  aws::ddb::types::{AttributeValue, PutRequest, WriteRequest},
  database::Value,
};
use std::collections::HashMap;
use std::iter::IntoIterator;

use comm_lib::database::{DBItemAttributeError, DBItemError};

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

pub trait AttributesOptionExt<T> {
  fn ok_or_missing(
    self,
    attr_name: impl Into<String>,
  ) -> Result<T, DBItemError>;
}

impl<T> AttributesOptionExt<T> for Option<T> {
  fn ok_or_missing(
    self,
    attr_name: impl Into<String>,
  ) -> Result<T, DBItemError> {
    self.ok_or_else(|| DBItemError {
      attribute_name: attr_name.into(),
      attribute_value: None.into(),
      attribute_error: DBItemAttributeError::Missing,
    })
  }
}

pub trait DateTimeExt {
  fn from_utc_timestamp_millis(timestamp: i64) -> Option<DateTime<Utc>>;
}

impl DateTimeExt for DateTime<Utc> {
  fn from_utc_timestamp_millis(timestamp: i64) -> Option<Self> {
    let naive = NaiveDateTime::from_timestamp_millis(timestamp)?;
    Some(Self::from_utc(naive, Utc))
  }
}

pub enum Identifier {
  Username(String),
  WalletAddress(String),
}
