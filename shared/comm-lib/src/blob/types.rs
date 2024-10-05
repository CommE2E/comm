use derive_more::Constructor;
use hex::ToHex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// This module defines structures for HTTP requests and responses
/// for the Blob Service. The definitions in this file should remain in sync
/// with the types and validators defined in the corresponding
/// JavaScript file at `lib/types/blob-service-types.js`.
///
/// If you edit the definitions in one file,
/// please make sure to update the corresponding definitions in the other.
pub mod http {
  use serde::{Deserialize, Serialize};

  pub use super::BlobInfo;

  // Assign multiple holders
  #[derive(Serialize, Deserialize, Debug)]
  #[serde(rename_all = "camelCase")]
  pub struct AssignHoldersRequest {
    pub requests: Vec<BlobInfo>,
  }

  #[derive(Serialize, Deserialize, Debug)]
  #[serde(rename_all = "camelCase")]
  pub struct HolderAssignmentResult {
    #[serde(flatten)]
    pub request: BlobInfo,
    pub success: bool,
    pub data_exists: bool,
    pub holder_already_exists: bool,
  }
  #[derive(Serialize, Deserialize, Debug)]
  #[serde(rename_all = "camelCase")]
  pub struct AssignHoldersResponse {
    pub results: Vec<HolderAssignmentResult>,
  }

  // Remove multiple holders
  #[derive(Serialize, Deserialize, Debug, Clone)]
  #[serde(untagged)]
  pub enum RemoveHoldersRequest {
    // remove holders with given (hash, holder) pairs
    #[serde(rename_all = "camelCase")]
    Items {
      requests: Vec<BlobInfo>,
      /// If true, the blobs will be deleted instantly
      /// after their last holders are revoked.
      #[serde(default)]
      instant_delete: bool,
    },
    // remove all holders that are indexed by any of given tags
    ByIndexedTags {
      tags: Vec<String>,
    },
  }

  #[derive(Serialize, Deserialize, Debug)]
  #[serde(rename_all = "camelCase")]
  pub struct RemoveHoldersResponse {
    pub failed_requests: Vec<BlobInfo>,
  }

  // Single holder endpoint types

  #[derive(Serialize, Deserialize, Debug)]
  pub struct AssignHolderRequest {
    pub blob_hash: String,
    pub holder: String,
  }
  #[derive(Serialize, Deserialize, Debug)]
  pub struct AssignHolderResponse {
    pub data_exists: bool,
  }

  #[derive(Serialize, Deserialize, Debug)]
  pub struct RemoveHolderRequest {
    pub blob_hash: String,
    pub holder: String,
    /// If true, the blob will be deleted instantly
    /// after the last holder is revoked.
    #[serde(default)]
    pub instant_delete: bool,
  }

  // impls
  impl From<Vec<BlobInfo>> for RemoveHoldersRequest {
    fn from(requests: Vec<BlobInfo>) -> Self {
      Self::Items {
        requests,
        instant_delete: false,
      }
    }
  }
}

/// Blob owning information - stores both blob_hash and holder
#[derive(Clone, Debug, Constructor, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlobInfo {
  pub blob_hash: String,
  pub holder: String,
}

impl BlobInfo {
  pub fn from_bytes(data: &[u8]) -> Self {
    Self {
      blob_hash: Sha256::digest(data).encode_hex(),
      holder: uuid::Uuid::new_v4().to_string(),
    }
  }
}

#[cfg(feature = "aws")]
mod db_conversions {
  use super::*;
  use crate::database::{AttributeTryInto, DBItemError, TryFromAttribute};
  use aws_sdk_dynamodb::types::AttributeValue;
  use std::collections::HashMap;

  const BLOB_HASH_DDB_MAP_KEY: &str = "blob_hash";
  const HOLDER_DDB_MAP_KEY: &str = "holder";

  impl From<BlobInfo> for AttributeValue {
    fn from(value: BlobInfo) -> Self {
      let map = HashMap::from([
        (
          BLOB_HASH_DDB_MAP_KEY.to_string(),
          AttributeValue::S(value.blob_hash),
        ),
        (
          HOLDER_DDB_MAP_KEY.to_string(),
          AttributeValue::S(value.holder),
        ),
      ]);
      AttributeValue::M(map)
    }
  }
  impl From<&BlobInfo> for AttributeValue {
    fn from(value: &BlobInfo) -> Self {
      AttributeValue::from(value.to_owned())
    }
  }

  impl TryFromAttribute for BlobInfo {
    fn try_from_attr(
      attribute_name: impl Into<String>,
      attribute: Option<AttributeValue>,
    ) -> Result<Self, DBItemError> {
      let attr_name: String = attribute_name.into();
      let mut inner_map: HashMap<String, AttributeValue> =
        attribute.attr_try_into(&attr_name)?;
      let blob_hash = inner_map
        .remove("blob_hash")
        .attr_try_into(format!("{attr_name}.blob_hash"))?;
      let holder = inner_map
        .remove("holder")
        .attr_try_into(format!("{attr_name}.holder"))?;
      Ok(BlobInfo { blob_hash, holder })
    }
  }
}

#[cfg(test)]
mod serialization_tests {
  use super::http::*;
  mod remove_holders_request {
    use super::*;

    #[test]
    fn serialize_items() {
      let req = RemoveHoldersRequest::Items {
        requests: vec![BlobInfo::new("a".into(), "b".into())],
        instant_delete: false,
      };
      let expected =
        r#"{"requests":[{"blobHash":"a","holder":"b"}],"instantDelete":false}"#;
      assert_eq!(expected, serde_json::to_string(&req).unwrap());
    }

    #[test]
    fn deserialize_items() {
      let json =
        r#"{"requests":[{"blobHash":"a","holder":"b"}],"instantDelete":false}"#;
      let deserialized: RemoveHoldersRequest =
        serde_json::from_str(json).expect("Request JSON payload invalid");

      let expected_items = vec![BlobInfo::new("a".into(), "b".into())];

      let is_matching = matches!(
        deserialized,
        RemoveHoldersRequest::Items {
          requests: items,
          instant_delete: false,
        } if items == expected_items
      );
      assert!(is_matching, "Deserialized request is incorrect");
    }

    #[test]
    fn serialize_tags() {
      let req = RemoveHoldersRequest::ByIndexedTags {
        tags: vec!["foo".into(), "bar".into()],
      };
      let expected = r#"{"tags":["foo","bar"]}"#;
      assert_eq!(expected, serde_json::to_string(&req).unwrap());
    }

    #[test]
    fn deserialize_tags() {
      let json = r#"{"tags":["foo","bar"]}"#;
      let deserialized: RemoveHoldersRequest =
        serde_json::from_str(json).expect("Request JSON payload invalid");

      let expected_tags: Vec<String> = vec!["foo".into(), "bar".into()];

      let is_matching = matches!(
        deserialized,
        RemoveHoldersRequest::ByIndexedTags {
          tags: actual_tags
        } if actual_tags == expected_tags
      );
      assert!(is_matching, "Deserialized request is incorrect");
    }
  }
}
