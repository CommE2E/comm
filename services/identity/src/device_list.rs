use chrono::{DateTime, Duration, Utc};

use crate::{
  constants::DEVICE_LIST_TIMESTAMP_VALID_FOR, error::DeviceListError,
};

/// Returns `true` if given timestamp is valid. The timestamp is considered
/// valid under the following condition:
/// - `new_timestamp` is greater than `previous_timestamp` (if provided)
/// - `new_timestamp` is not older than [`DEVICE_LIST_TIMESTAMP_VALID_FOR`]
///
/// Note: For Identity-managed device lists, the timestamp can be `None`.
/// Verification is then skipped
fn is_new_timestamp_valid(
  previous_timestamp: Option<&DateTime<Utc>>,
  new_timestamp: Option<&DateTime<Utc>>,
) -> bool {
  let Some(new_timestamp) = new_timestamp else {
    return true;
  };

  if let Some(previous_timestamp) = previous_timestamp {
    if new_timestamp < previous_timestamp {
      return false;
    }
  }

  let timestamp_valid_duration =
    Duration::from_std(DEVICE_LIST_TIMESTAMP_VALID_FOR)
      .expect("FATAL - Invalid duration constant provided");

  Utc::now().signed_duration_since(new_timestamp) < timestamp_valid_duration
}

/// Returns error if new timestamp is invalid. The timestamp is considered
/// valid under the following condition:
/// - `new_timestamp` is greater than `previous_timestamp` (if provided)
/// - `new_timestamp` is not older than [`DEVICE_LIST_TIMESTAMP_VALID_FOR`]
///
/// Note: For Identity-managed device lists, the timestamp can be `None`.
/// Verification is then skipped
pub fn verify_device_list_timestamp(
  previous_timestamp: Option<&DateTime<Utc>>,
  new_timestamp: Option<&DateTime<Utc>>,
) -> Result<(), DeviceListError> {
  if !is_new_timestamp_valid(previous_timestamp, new_timestamp) {
    return Err(DeviceListError::InvalidDeviceListUpdate);
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_timestamp_validation() {
    let valid_timestamp = Utc::now() - Duration::milliseconds(100);
    let previous_timestamp = Utc::now() - Duration::seconds(10);
    let too_old_timestamp = previous_timestamp - Duration::seconds(1);
    let expired_timestamp = Utc::now() - Duration::minutes(20);

    assert!(
      verify_device_list_timestamp(
        Some(&previous_timestamp),
        Some(&valid_timestamp)
      )
      .is_ok(),
      "Valid timestamp should pass verification"
    );
    assert!(
      verify_device_list_timestamp(
        Some(&previous_timestamp),
        Some(&too_old_timestamp)
      )
      .is_err(),
      "Timestamp older than previous, should fail verification"
    );
    assert!(
      verify_device_list_timestamp(None, Some(&expired_timestamp)).is_err(),
      "Expired timestamp should fail verification"
    );
    assert!(
      verify_device_list_timestamp(None, None).is_ok(),
      "No provided timestamp should pass"
    );
  }
}
