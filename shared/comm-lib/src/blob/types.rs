use derive_more::Constructor;
use hex::ToHex;
use sha2::{Digest, Sha256};

/// Blob owning information - stores both blob_hash and holder
#[derive(Clone, Debug, Constructor)]
pub struct BlobInfo {
  pub blob_hash: String,
  pub holder: String,
}

impl BlobInfo {
  pub fn from_bytes(data: &[u8]) -> Self {
    Self {
      blob_hash: Sha256::digest(&data).encode_hex(),
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
