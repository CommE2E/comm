use aws_sdk_dynamodb::model::{AttributeValue, PutRequest, WriteRequest};
use std::collections::HashMap;
use std::iter::IntoIterator;

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
