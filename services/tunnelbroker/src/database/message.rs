use std::collections::HashMap;

use aws_sdk_dynamodb::types::AttributeValue;
use tunnelbroker_messages::MessageToDevice;

use crate::constants::dynamodb::undelivered_messages::{
  DEVICE_ID, MESSAGE_ID, PAYLOAD,
};

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum MessageErrors {
  SerializationError,
}

pub trait MessageToDeviceExt {
  fn from_hashmap(
    hashmap: HashMap<String, AttributeValue>,
  ) -> Result<MessageToDevice, MessageErrors>;
}

impl MessageToDeviceExt for MessageToDevice {
  fn from_hashmap(
    hashmap: HashMap<String, AttributeValue>,
  ) -> Result<MessageToDevice, MessageErrors> {
    let device_id: String = hashmap
      .get(DEVICE_ID)
      .ok_or(MessageErrors::SerializationError)?
      .as_s()
      .map_err(|_| MessageErrors::SerializationError)?
      .to_string();
    let message_id: String = hashmap
      .get(MESSAGE_ID)
      .ok_or(MessageErrors::SerializationError)?
      .as_s()
      .map_err(|_| MessageErrors::SerializationError)?
      .to_string();
    let payload: String = hashmap
      .get(PAYLOAD)
      .ok_or(MessageErrors::SerializationError)?
      .as_s()
      .map_err(|_| MessageErrors::SerializationError)?
      .to_string();

    Ok(MessageToDevice {
      device_id,
      message_id,
      payload,
    })
  }
}
