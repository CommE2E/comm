use comm_lib::database::{AttributeExtractor, AttributeMap};
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
    hashmap: AttributeMap,
  ) -> Result<MessageToDevice, MessageErrors>;
}

impl MessageToDeviceExt for MessageToDevice {
  fn from_hashmap(
    mut hashmap: AttributeMap,
  ) -> Result<MessageToDevice, MessageErrors> {
    let device_id: String = hashmap
      .take_attr(DEVICE_ID)
      .map_err(|_| MessageErrors::SerializationError)?;
    let message_id: String = hashmap
      .take_attr(MESSAGE_ID)
      .map_err(|_| MessageErrors::SerializationError)?;
    let payload: String = hashmap
      .take_attr(PAYLOAD)
      .map_err(|_| MessageErrors::SerializationError)?;

    Ok(MessageToDevice {
      device_id,
      message_id,
      payload,
    })
  }
}
