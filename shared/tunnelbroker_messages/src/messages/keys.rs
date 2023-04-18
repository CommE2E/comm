// Messages sent between tunnelbroker and a device

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct RefreshKeyRequest {
  pub device_id: String,
  pub number_of_keys: u32,
}

#[cfg(test)]
mod key_tests {
  use super::*;

  #[test]
  fn test_refresh_deserialization() {
    let example_payload = r#"{
      "type": "RefreshKeyRequest",
      "deviceId": "adfjEDFS",
      "numberOfKeys": 6
    }"#;

    let request =
      serde_json::from_str::<RefreshKeyRequest>(example_payload).unwrap();
    assert_eq!(request.number_of_keys, 6);
  }
}
