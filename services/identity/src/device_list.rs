use chrono::{DateTime, Duration, Utc};
use std::collections::HashSet;
use tracing::{error, warn};

use crate::{
  constants::DEVICE_LIST_TIMESTAMP_VALID_FOR,
  database::{DeviceListRow, DeviceListUpdate},
  ddb_utils::DateTimeExt,
  error::DeviceListError,
  grpc_services::protos::auth::UpdateDeviceListRequest,
};

// serde helper for serializing/deserializing
// device list JSON payload
#[derive(serde::Serialize, serde::Deserialize)]
struct RawDeviceList {
  devices: Vec<String>,
  timestamp: i64,
}

/// Signed device list payload that is serializable to JSON.
/// For the DDB payload, see [`DeviceListUpdate`]
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedDeviceList {
  /// JSON-stringified [`RawDeviceList`]
  raw_device_list: String,
  /// Current primary device signature.
  /// NOTE: Present only when the payload is received from primary device.
  /// It's `None` for Identity-generated device-lists
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  cur_primary_signature: Option<String>,
  /// Previous primary device signature. Present only
  /// if primary device has changed since last update.
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  last_primary_signature: Option<String>,
}

impl SignedDeviceList {
  fn as_raw(&self) -> Result<RawDeviceList, tonic::Status> {
    // The device list payload is sent as an escaped JSON payload.
    // Escaped double quotes need to be trimmed before attempting to deserialize
    serde_json::from_str(&self.raw_device_list.replace(r#"\""#, r#"""#))
      .map_err(|err| {
        warn!("Failed to deserialize raw device list: {}", err);
        tonic::Status::invalid_argument("invalid device list payload")
      })
  }

  /// Serializes the signed device list to a JSON string
  pub fn as_json_string(&self) -> Result<String, tonic::Status> {
    serde_json::to_string(self).map_err(|err| {
      error!("Failed to serialize device list updates: {}", err);
      tonic::Status::failed_precondition("unexpected error")
    })
  }
}

impl TryFrom<DeviceListRow> for SignedDeviceList {
  type Error = tonic::Status;

  fn try_from(row: DeviceListRow) -> Result<Self, Self::Error> {
    let raw_list = RawDeviceList {
      devices: row.device_ids,
      timestamp: row.timestamp.timestamp_millis(),
    };
    let stringified_list = serde_json::to_string(&raw_list).map_err(|err| {
      error!("Failed to serialize raw device list: {}", err);
      tonic::Status::failed_precondition("unexpected error")
    })?;

    Ok(Self {
      raw_device_list: stringified_list,
      cur_primary_signature: row.current_primary_signature,
      last_primary_signature: row.last_primary_signature,
    })
  }
}

impl TryFrom<UpdateDeviceListRequest> for SignedDeviceList {
  type Error = tonic::Status;
  fn try_from(request: UpdateDeviceListRequest) -> Result<Self, Self::Error> {
    serde_json::from_str(&request.new_device_list).map_err(|err| {
      warn!("Failed to deserialize device list update: {}", err);
      tonic::Status::invalid_argument("invalid device list payload")
    })
  }
}

impl TryFrom<SignedDeviceList> for DeviceListUpdate {
  type Error = tonic::Status;
  fn try_from(signed_list: SignedDeviceList) -> Result<Self, Self::Error> {
    let RawDeviceList {
      devices,
      timestamp: raw_timestamp,
    } = signed_list.as_raw()?;
    let timestamp = DateTime::<Utc>::from_utc_timestamp_millis(raw_timestamp)
      .ok_or_else(|| {
      error!("Failed to parse RawDeviceList timestamp!");
      tonic::Status::invalid_argument("invalid timestamp")
    })?;
    Ok(DeviceListUpdate {
      devices,
      timestamp,
      current_primary_signature: signed_list.cur_primary_signature,
      last_primary_signature: signed_list.last_primary_signature,
    })
  }
}

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

  /// Returns `true` if `new_device_list` contains exactly one fewer device
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

  /// Verifies if exactly one device has been replaced.
  /// No reorders are permitted. Both lists have to have the same length.
  fn is_device_replaced(
    previous_device_list: &[&str],
    new_device_list: &[&str],
  ) -> bool {
    if previous_device_list.len() != new_device_list.len() {
      return false;
    }

    // exactly 1 different device ID
    std::iter::zip(previous_device_list, new_device_list)
      .filter(|(a, b)| a != b)
      .count()
      == 1
  }

  // This is going to be used when doing primary devicd keys rotation
  #[allow(unused)]
  pub fn primary_device_rotation_validator(
    previous_device_list: &[&str],
    new_device_list: &[&str],
  ) -> bool {
    primary_device_changed(previous_device_list, new_device_list)
      && !is_device_replaced(&previous_device_list[1..], &new_device_list[1..])
  }

  /// The `UpdateDeviceList` RPC should be able to either add or remove
  /// one device, and it cannot currently switch primary devices.
  /// The RPC is also able to replace a keyserver device
  pub fn update_device_list_rpc_validator(
    previous_device_list: &[&str],
    new_device_list: &[&str],
  ) -> bool {
    if primary_device_changed(previous_device_list, new_device_list) {
      return false;
    }

    // allow replacing a keyserver
    if is_device_replaced(previous_device_list, new_device_list) {
      return true;
    }

    let is_added = is_device_added(previous_device_list, new_device_list);
    let is_removed = is_device_removed(previous_device_list, new_device_list);

    is_added != is_removed
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

    #[test]
    fn test_device_replaced() {
      use std::ops::Not;

      let list1 = vec!["device1"];
      let list2 = vec!["device2"];
      let list3 = vec!["device1", "device2"];
      let list4 = vec!["device2", "device1"];
      let list5 = vec!["device2", "device3"];

      assert!(is_device_replaced(&list1, &list2), "Singleton replacement");
      assert!(is_device_replaced(&list4, &list5), "Standard replacement");
      assert!(is_device_replaced(&list1, &list3).not(), "Length unequal");
      assert!(is_device_replaced(&list3, &list3).not(), "Unchanged");
      assert!(is_device_replaced(&list3, &list4).not(), "Reorder");
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn deserialize_device_list_signature() {
    let payload_with_signature = r#"{"rawDeviceList":"{\"devices\":[\"device1\"],\"timestamp\":111111111}","curPrimarySignature":"foo"}"#;
    let payload_without_signatures = r#"{"rawDeviceList":"{\"devices\":[\"device1\",\"device2\"],\"timestamp\":222222222}"}"#;

    let list_with_signature: SignedDeviceList =
      serde_json::from_str(payload_with_signature).unwrap();
    let list_without_signatures: SignedDeviceList =
      serde_json::from_str(payload_without_signatures).unwrap();

    assert_eq!(
      list_with_signature.cur_primary_signature,
      Some("foo".to_string())
    );
    assert!(list_with_signature.last_primary_signature.is_none());

    assert!(list_without_signatures.cur_primary_signature.is_none());
    assert!(list_without_signatures.last_primary_signature.is_none());
  }

  #[test]
  fn serialize_device_list_signatures() {
    let raw_list = r#"{"devices":["device1"],"timestamp":111111111}"#;

    let expected_payload_without_signatures = r#"{"rawDeviceList":"{\"devices\":[\"device1\"],\"timestamp\":111111111}"}"#;
    let device_list_without_signature = SignedDeviceList {
      raw_device_list: raw_list.to_string(),
      cur_primary_signature: None,
      last_primary_signature: None,
    };
    assert_eq!(
      device_list_without_signature.as_json_string().unwrap(),
      expected_payload_without_signatures
    );

    let expected_payload_with_signature = r#"{"rawDeviceList":"{\"devices\":[\"device1\"],\"timestamp\":111111111}","curPrimarySignature":"foo"}"#;
    let device_list_with_cur_signature = SignedDeviceList {
      raw_device_list: raw_list.to_string(),
      cur_primary_signature: Some("foo".to_string()),
      last_primary_signature: None,
    };
    assert_eq!(
      device_list_with_cur_signature.as_json_string().unwrap(),
      expected_payload_with_signature
    );
  }

  #[test]
  fn serialize_device_list_updates() {
    let raw_updates = vec![
      create_db_row(RawDeviceList {
        devices: vec!["device1".into()],
        timestamp: 111111111,
      }),
      create_db_row(RawDeviceList {
        devices: vec!["device1".into(), "device2".into()],
        timestamp: 222222222,
      }),
    ];

    let expected_raw_list1 = r#"{"devices":["device1"],"timestamp":111111111}"#;
    let expected_raw_list2 =
      r#"{"devices":["device1","device2"],"timestamp":222222222}"#;

    let signed_updates = raw_updates
      .into_iter()
      .map(SignedDeviceList::try_from)
      .collect::<Result<Vec<_>, _>>()
      .expect("signing device list updates failed");

    assert_eq!(signed_updates[0].raw_device_list, expected_raw_list1);
    assert_eq!(signed_updates[1].raw_device_list, expected_raw_list2);

    let stringified_updates = signed_updates
      .iter()
      .map(serde_json::to_string)
      .collect::<Result<Vec<_>, _>>()
      .expect("serialize signed device lists failed");

    let expected_stringified_list1 = r#"{"rawDeviceList":"{\"devices\":[\"device1\"],\"timestamp\":111111111}"}"#;
    let expected_stringified_list2 = r#"{"rawDeviceList":"{\"devices\":[\"device1\",\"device2\"],\"timestamp\":222222222}"}"#;

    assert_eq!(stringified_updates[0], expected_stringified_list1);
    assert_eq!(stringified_updates[1], expected_stringified_list2);
  }

  #[test]
  fn deserialize_device_list_update() {
    let raw_payload = r#"{"rawDeviceList":"{\"devices\":[\"device1\",\"device2\"],\"timestamp\":123456789}"}"#;
    let request = UpdateDeviceListRequest {
      new_device_list: raw_payload.to_string(),
    };

    let signed_list = SignedDeviceList::try_from(request)
      .expect("Failed to parse SignedDeviceList");
    let update = DeviceListUpdate::try_from(signed_list)
      .expect("Failed to parse DeviceListUpdate from signed list");

    let expected_timestamp =
      DateTime::<Utc>::from_utc_timestamp_millis(123456789).unwrap();

    assert_eq!(update.timestamp, expected_timestamp);
    assert_eq!(
      update.devices,
      vec!["device1".to_string(), "device2".to_string()]
    );
  }

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

  /// helper for mocking DB rows from raw device list payloads
  fn create_db_row(raw_list: RawDeviceList) -> DeviceListRow {
    DeviceListRow {
      user_id: "".to_string(),
      device_ids: raw_list.devices,
      timestamp: DateTime::<Utc>::from_utc_timestamp_millis(raw_list.timestamp)
        .unwrap(),
      current_primary_signature: None,
      last_primary_signature: None,
    }
  }
}
