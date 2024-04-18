use chrono::{DateTime, Duration, Utc};
use std::collections::HashSet;

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

pub mod validation {
  use super::*;
  /// Returns `true` if `new_device_list` contains exactly one more new device
  /// compared to `previous_device_list`
  fn is_device_added(
    previous_device_list: &[&str],
    new_device_list: &[&str],
  ) -> bool {
    let previous_set: HashSet<_> = previous_device_list.iter().collect();
    let new_set: HashSet<_> = new_device_list.iter().collect();

    return new_set.difference(&previous_set).count() == 1;
  }

  /// Returns `true` if `new_device_list` contains exactly one device removed
  /// compared to `previous_device_list`
  fn is_device_removed(
    previous_device_list: &[&str],
    new_device_list: &[&str],
  ) -> bool {
    let previous_set: HashSet<_> = previous_device_list.iter().collect();
    let new_set: HashSet<_> = new_device_list.iter().collect();

    return previous_set.difference(&new_set).count() == 1;
  }

  fn primary_device_changed(
    previous_device_list: &[&str],
    new_device_list: &[&str],
  ) -> bool {
    let previous_primary = previous_device_list.first();
    let new_primary = new_device_list.first();

    new_primary != previous_primary
  }

  /// The `UpdateDeviceList` RPC should be able to either add or remove
  /// one device, and it cannot currently switch primary devices
  pub fn update_device_list_rpc_validator(
    previous_device_list: &[&str],
    new_device_list: &[&str],
  ) -> bool {
    if primary_device_changed(previous_device_list, new_device_list) {
      return false;
    }

    let is_added = is_device_added(previous_device_list, new_device_list);
    let is_removed = is_device_removed(previous_device_list, new_device_list);

    (is_added && !is_removed) || (is_removed && !is_added)
  }

  #[cfg(test)]
  mod tests {
    use super::*;

    #[test]
    fn test_device_added_or_removed() {
      use std::ops::Not;

      let list1 = vec!["device1"];
      let list2 = vec!["device1", "device2"];

      assert!(is_device_added(&list1, &list2));
      assert!(is_device_removed(&list1, &list2).not());

      assert!(is_device_added(&list2, &list1).not());
      assert!(is_device_removed(&list2, &list1));

      assert!(is_device_added(&list1, &list1).not());
      assert!(is_device_removed(&list1, &list1).not());
    }

    #[test]
    fn test_primary_device_changed() {
      use std::ops::Not;

      let list1 = vec!["device1"];
      let list2 = vec!["device1", "device2"];
      let list3 = vec!["device2"];

      assert!(primary_device_changed(&list1, &list2).not());
      assert!(primary_device_changed(&list1, &list3));
    }
  }
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
