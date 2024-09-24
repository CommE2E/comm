use comm_lib::database::{AttributeExtractor, AttributeMap, DBItemError};
use tunnelbroker_messages::MessageToDevice;

use crate::constants::dynamodb::undelivered_messages::{
  DEVICE_ID, MESSAGE_ID, PAYLOAD,
};
use crate::constants::error_types;

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum MessageErrors {
  SerializationError,
}

impl From<DBItemError> for MessageErrors {
  fn from(err: DBItemError) -> Self {
    tracing::error!(
      errorType = error_types::DDB_ERROR,
      "Failed to extract MessageToDevice attribute: {:?}",
      err
    );
    MessageErrors::SerializationError
  }
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
    let device_id: String = hashmap.take_attr(DEVICE_ID)?;
    let message_id: String = hashmap.take_attr(MESSAGE_ID)?;
    let payload: String = hashmap.take_attr(PAYLOAD)?;

    Ok(MessageToDevice {
      device_id,
      message_id,
      payload,
    })
  }
}
