use std::collections::HashMap;

use aws_sdk_dynamodb::types::AttributeValue;

use crate::constants::dynamodb::undelivered_messages::{
  CREATED_AT, DEVICE_ID, PAYLOAD,
};

#[derive(Debug)]
pub struct DeviceMessage {
  pub device_id: String,
  pub created_at: String,
  pub payload: String,
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum MessageErrors {
  SerializationError,
}

impl DeviceMessage {
  pub fn from_hashmap(
    hashmap: HashMap<String, AttributeValue>,
  ) -> Result<DeviceMessage, MessageErrors> {
    let device_id: String = hashmap
      .get(DEVICE_ID)
      .ok_or(MessageErrors::SerializationError)?
      .as_s()
      .map_err(|_| MessageErrors::SerializationError)?
      .to_string();
    let created_at: String = hashmap
      .get(CREATED_AT)
      .ok_or(MessageErrors::SerializationError)?
      .as_n()
      .map_err(|_| MessageErrors::SerializationError)?
      .to_string();
    let payload: String = hashmap
      .get(PAYLOAD)
      .ok_or(MessageErrors::SerializationError)?
      .as_s()
      .map_err(|_| MessageErrors::SerializationError)?
      .to_string();

    Ok(DeviceMessage {
      device_id,
      created_at,
      payload,
    })
  }
}
