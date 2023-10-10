use chrono::{DateTime, Utc};

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum ParseMessageIdError {
  InvalidTimestamp(chrono::ParseError),
  InvalidFormat,
}
#[derive(Debug)]
pub struct MessageID {
  timestamp: DateTime<Utc>,
  client_message_id: String,
}

impl MessageID {
  pub fn new(client_message_id: String) -> Self {
    Self {
      timestamp: Utc::now(),
      client_message_id,
    }
  }
}

impl TryFrom<String> for MessageID {
  type Error = ParseMessageIdError;

  fn try_from(value: String) -> Result<Self, Self::Error> {
    let parts: Vec<&str> = value.splitn(2, '#').collect();
    if parts.len() != 2 {
      return Err(ParseMessageIdError::InvalidFormat);
    }

    let timestamp = DateTime::parse_from_rfc3339(parts[0])
      .map_err(ParseMessageIdError::InvalidTimestamp)?
      .with_timezone(&Utc);

    let client_message_id = parts[1].to_string();

    Ok(Self {
      timestamp,
      client_message_id,
    })
  }
}

impl From<MessageID> for String {
  fn from(value: MessageID) -> Self {
    format!(
      "{}#{}",
      value.timestamp.to_rfc3339(),
      value.client_message_id
    )
  }
}

#[cfg(test)]
mod message_id_tests {
  use super::*;
  use std::convert::TryInto;

  #[test]
  fn test_into_string() {
    let message_id = MessageID::new("abc123".to_string());

    let message_id_string: String = message_id.into();
    assert!(
      message_id_string.contains("abc123"),
      "Expected 'abc123' in the resulting string, but not found"
    );

    let parts: Vec<&str> = message_id_string.splitn(2, '#').collect();
    assert_eq!(
      parts.len(),
      2,
      "Expected the string to contain 2 parts separated by '#'"
    );
  }

  #[test]
  fn test_try_from_string_valid() {
    let client_message_id = "abc123".to_string();
    let timestamp = Utc::now().to_rfc3339();
    let valid_string = format!("{}#{}", timestamp, client_message_id);

    let message_id_result: Result<MessageID, _> = valid_string.try_into();

    assert!(
      message_id_result.is_ok(),
      "Expected Ok, but found {:?}",
      message_id_result
    );
    let message_id = message_id_result.unwrap();
    assert_eq!(message_id.client_message_id, client_message_id);
  }

  #[test]
  fn test_try_from_string_invalid_format() {
    let message_id = MessageID::new("abc123".to_string());
    let message_id_str: String = message_id.into();
    let converted_message_id: Result<MessageID, _> = message_id_str.try_into();

    assert!(
      converted_message_id.is_ok(),
      "Expected Ok, but found {:?}",
      converted_message_id
    );
    let message_id_after_conversion = converted_message_id.unwrap();

    assert_eq!(
      message_id_after_conversion.client_message_id,
      "abc123".to_string()
    );
  }

  #[test]
  fn test_conversion() {
    let client_message_id = "abc123".to_string();
    let timestamp = Utc::now().to_rfc3339();
    let valid_string = format!("{}#{}", timestamp, client_message_id);

    let message_id_result: Result<MessageID, _> = valid_string.try_into();

    assert!(
      message_id_result.is_ok(),
      "Expected Ok, but found {:?}",
      message_id_result
    );
    let message_id = message_id_result.unwrap();
    assert_eq!(message_id.client_message_id, client_message_id);
  }
}
