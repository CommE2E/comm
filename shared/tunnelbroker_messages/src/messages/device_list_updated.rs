//! Messages sent from Identity to device informing that device list was updated.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct IdentityDeviceListUpdated {}
