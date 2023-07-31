use aws_sdk_dynamodb::model::{AttributeValue, PutRequest, WriteRequest};
use std::collections::HashMap;
use std::iter::IntoIterator;

fn create_onetime_key_put_request(
  device_id: String,
  onetime_key: String,
) -> WriteRequest {
  // The content and notif onetime key tables use the same partition and sort
  // key
  use crate::constants::content_one_time_keys_table::*;

  let builder = PutRequest::builder();
  let attrs = HashMap::from([
    (PARTITION_KEY.to_string(), AttributeValue::S(device_id)),
    (SORT_KEY.to_string(), AttributeValue::S(onetime_key)),
  ]);

  let put_request = builder.set_item(Some(attrs)).build();

  WriteRequest::builder().put_request(put_request).build()
}

pub fn into_onetime_put_requests<T>(
  device_id: String,
  onetime_keys: T,
) -> Vec<WriteRequest>
where
  T: IntoIterator,
  <T as IntoIterator>::Item: ToString,
{
  onetime_keys
    .into_iter()
    .map(|otk| {
      create_onetime_key_put_request(device_id.clone(), otk.to_string())
    })
    .collect()
}
