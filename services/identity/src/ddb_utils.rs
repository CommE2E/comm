use aws_sdk_dynamodb::model::{AttributeValue, PutRequest, WriteRequest};
use std::collections::HashMap;
use std::iter::IntoIterator;

#[derive(Copy, Clone, Debug)]
pub enum OlmAccountType {
  Content,
  Notification,
}

// Prefix the onetime keys with the olm account variant. This allows for a single
// DDB table to contain both notification and content keys for a device.
pub fn create_onetime_key_partition_key(
  device_id: &str,
  account_type: OlmAccountType,
) -> String {
  match account_type {
    OlmAccountType::Content => format!("content_{device_id}"),
    OlmAccountType::Notification => format!("notification_{device_id}"),
  }
}

fn create_onetime_key_put_request(
  device_id: &str,
  onetime_key: String,
  account_type: OlmAccountType,
) -> WriteRequest {
  // The content and notif onetime key tables use the same partition and sort
  // key
  use crate::constants::one_time_keys_table::*;

  let partition_key = create_onetime_key_partition_key(device_id, account_type);
  let builder = PutRequest::builder();
  let attrs = HashMap::from([
    (PARTITION_KEY.to_string(), AttributeValue::S(partition_key)),
    (SORT_KEY.to_string(), AttributeValue::S(onetime_key)),
  ]);

  let put_request = builder.set_item(Some(attrs)).build();

  WriteRequest::builder().put_request(put_request).build()
}

pub fn into_onetime_put_requests<T>(
  device_id: &str,
  onetime_keys: T,
  account_type: OlmAccountType,
) -> Vec<WriteRequest>
where
  T: IntoIterator,
  <T as IntoIterator>::Item: ToString,
{
  onetime_keys
    .into_iter()
    .map(|otk| {
      create_onetime_key_put_request(device_id, otk.to_string(), account_type)
    })
    .collect()
}
