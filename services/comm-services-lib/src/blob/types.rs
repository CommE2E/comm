use aws_sdk_dynamodb::types::AttributeValue;
use derive_more::Constructor;
use std::collections::HashMap;

use crate::database::{AttributeTryInto, DBItemError, TryFromAttribute};

/// Blob owning information - stores both blob_hash and holder
#[derive(Clone, Debug, Constructor)]
pub struct BlobInfo {
  pub blob_hash: String,
  pub holder: String,
}

impl From<BlobInfo> for AttributeValue {
  fn from(value: BlobInfo) -> Self {
    let map = HashMap::from([
      ("blob_hash".to_string(), AttributeValue::S(value.blob_hash)),
      ("holder".to_string(), AttributeValue::S(value.holder)),
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
