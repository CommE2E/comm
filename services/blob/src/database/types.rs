use aws_sdk_dynamodb::types::AttributeValue;
use chrono::{DateTime, Utc};
use comm_lib::database::{
  parse_timestamp_attribute, AttributeExtractor, AttributeMap,
  AttributeTryInto, DBItemError, TryFromAttribute, Value,
};
use derive_more::Constructor;
use std::collections::HashMap;

use crate::{config::CONFIG, constants::db::*, s3::S3Path};

use super::errors::Error as DBError;

/// Represents a database row in the DynamoDB SDK format
pub(super) type RawAttributes = HashMap<String, AttributeValue>;
/// A convenience Result type for database operations
pub(super) type DBResult<T> = Result<T, DBError>;

/// Represents a type-safe version of a DynamoDB blob table item.
/// Each row can be either a blob item or a holder assignment.
///
/// It implements the `TryFrom` trait to convert from raw DynamoDB
/// `AttributeValue`s to the type-safe version.
pub enum DBRow {
  BlobItem(BlobItemRow),
  HolderAssignment(HolderAssignmentRow),
}

impl TryFrom<RawAttributes> for DBRow {
  type Error = DBError;

  fn try_from(attributes: RawAttributes) -> Result<Self, Self::Error> {
    let holder: String = attributes
      .get(ATTR_HOLDER)
      .cloned()
      .attr_try_into(ATTR_HOLDER)?;
    let row = match holder.as_str() {
      BLOB_ITEM_ROW_HOLDER_VALUE => DBRow::BlobItem(attributes.try_into()?),
      _ => DBRow::HolderAssignment(attributes.try_into()?),
    };
    Ok(row)
  }
}

#[derive(Debug)]
pub struct MediaInfo {
  pub content_type: Option<String>,
  pub custom_metadata: Option<String>,
}

const MEDIA_INFO_CONTENT_TYPE: &str = "contentType";
const MEDIA_INFO_CUSTOM_METADATA: &str = "customMetadata";

impl From<MediaInfo> for AttributeValue {
  fn from(value: MediaInfo) -> Self {
    let mut attrs = HashMap::new();
    if let Some(content_type) = value.content_type {
      attrs.insert(
        MEDIA_INFO_CONTENT_TYPE.to_string(),
        AttributeValue::S(content_type),
      );
    }
    if let Some(custom_metadata) = value.custom_metadata {
      attrs.insert(
        MEDIA_INFO_CUSTOM_METADATA.to_string(),
        AttributeValue::S(custom_metadata),
      );
    }
    AttributeValue::M(attrs)
  }
}

impl TryFrom<AttributeMap> for MediaInfo {
  type Error = comm_lib::database::DBItemError;

  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let content_type = attrs.take_attr(MEDIA_INFO_CONTENT_TYPE)?;
    let custom_metadata = attrs.take_attr(MEDIA_INFO_CUSTOM_METADATA)?;
    Ok(Self {
      content_type,
      custom_metadata,
    })
  }
}

impl TryFromAttribute for MediaInfo {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, comm_lib::database::DBItemError> {
    AttributeMap::try_from_attr(attribute_name, attribute)
      .and_then(MediaInfo::try_from)
  }
}

/// Represents an input payload for inserting a blob item into the database.
/// This contains only the business logic related attributes
#[derive(Debug)]
pub struct BlobItemInput {
  pub blob_hash: String,
  pub s3_path: S3Path,
  pub media_info: Option<MediaInfo>,
}

impl BlobItemInput {
  pub fn new(
    blob_hash: impl Into<String>,
    media_info: Option<MediaInfo>,
  ) -> Self {
    let blob_hash: String = blob_hash.into();
    BlobItemInput {
      blob_hash: blob_hash.clone(),
      s3_path: S3Path {
        bucket_name: CONFIG.s3_bucket_name.clone(),
        object_name: blob_hash,
      },
      media_info,
    }
  }
}

/// A struct representing a blob item row in the table in a type-safe way
///
/// It implements the `TryFrom` trait to convert from raw DynamoDB
/// `AttributeValue`s to the type-safe version.
#[derive(Debug)]
pub struct BlobItemRow {
  pub blob_hash: String,
  pub s3_path: S3Path,
  pub unchecked: bool,
  pub created_at: DateTime<Utc>,
  pub last_modified: DateTime<Utc>,
  pub media_info: Option<MediaInfo>,
}

impl TryFrom<RawAttributes> for BlobItemRow {
  type Error = DBError;

  fn try_from(mut attributes: RawAttributes) -> Result<Self, Self::Error> {
    let blob_hash = attributes.take_attr(ATTR_BLOB_HASH)?;
    let s3_path: String = attributes.take_attr(ATTR_S3_PATH)?;
    let created_at = parse_timestamp_attribute(
      ATTR_CREATED_AT,
      attributes.remove(ATTR_CREATED_AT),
    )?;
    let last_modified = parse_timestamp_attribute(
      ATTR_LAST_MODIFIED,
      attributes.remove(ATTR_LAST_MODIFIED),
    )?;
    let unchecked = is_raw_row_unchecked(&attributes, UncheckedKind::Blob)?;
    let s3_path = S3Path::from_full_path(&s3_path).map_err(DBError::from)?;

    let media_info = attributes.take_attr(ATTR_MEDIA_INFO)?;

    Ok(BlobItemRow {
      blob_hash,
      s3_path,
      unchecked,
      created_at,
      last_modified,
      media_info,
    })
  }
}

/// A struct representing a holder assignment table row in a type-safe way
///
/// It implements the `TryFrom` trait to convert from raw DynamoDB
/// `AttributeValue`s to the type-safe version.
#[derive(Debug)]
pub struct HolderAssignmentRow {
  pub blob_hash: String,
  pub holder: String,
  pub unchecked: bool,
  pub created_at: DateTime<Utc>,
  pub last_modified: DateTime<Utc>,
}

impl TryFrom<RawAttributes> for HolderAssignmentRow {
  type Error = DBError;

  fn try_from(mut attributes: RawAttributes) -> Result<Self, Self::Error> {
    let holder = attributes.remove(ATTR_HOLDER).attr_try_into(ATTR_HOLDER)?;
    let blob_hash = attributes
      .remove(ATTR_BLOB_HASH)
      .attr_try_into(ATTR_BLOB_HASH)?;
    let created_at = parse_timestamp_attribute(
      ATTR_CREATED_AT,
      attributes.remove(ATTR_CREATED_AT),
    )?;
    let last_modified = parse_timestamp_attribute(
      ATTR_LAST_MODIFIED,
      attributes.remove(ATTR_LAST_MODIFIED),
    )?;
    let unchecked = is_raw_row_unchecked(&attributes, UncheckedKind::Holder)?;
    Ok(HolderAssignmentRow {
      blob_hash,
      holder,
      unchecked,
      created_at,
      last_modified,
    })
  }
}

/// Represents a composite primary key for a DynamoDB table row
///
/// It implements `TryFrom` and `Into` traits to conveniently use it
/// in DynamoDB queries
#[derive(Clone, Constructor, Debug, Hash, Eq, PartialEq)]
pub struct PrimaryKey {
  pub blob_hash: String,
  pub holder: String,
}

impl PrimaryKey {
  /// Creates a primary key for a row containing a blob item data
  /// Rows queried by primary keys created by this function will
  /// be of type `BlobItemRow`
  pub fn for_blob_item(blob_hash: impl Into<String>) -> Self {
    PrimaryKey {
      blob_hash: blob_hash.into(),
      holder: BLOB_ITEM_ROW_HOLDER_VALUE.to_string(),
    }
  }

  pub fn is_blob_item(&self) -> bool {
    self.holder == BLOB_ITEM_ROW_HOLDER_VALUE
  }
}

impl TryFrom<RawAttributes> for PrimaryKey {
  type Error = DBError;

  fn try_from(mut attributes: RawAttributes) -> Result<Self, Self::Error> {
    let blob_hash = attributes
      .remove(ATTR_BLOB_HASH)
      .attr_try_into(ATTR_BLOB_HASH)?;
    let holder = attributes.remove(ATTR_HOLDER).attr_try_into(ATTR_HOLDER)?;
    Ok(PrimaryKey { blob_hash, holder })
  }
}

// useful for convenient calls:
// ddb.get_item().set_key(Some(partition_key.into()))
impl From<PrimaryKey> for RawAttributes {
  fn from(val: PrimaryKey) -> Self {
    HashMap::from([
      (ATTR_BLOB_HASH.to_string(), AttributeValue::S(val.blob_hash)),
      (ATTR_HOLDER.to_string(), AttributeValue::S(val.holder)),
    ])
  }
}

/// Represents possible values for the `unchecked` attribute value
pub enum UncheckedKind {
  Blob,
  Holder,
}

impl UncheckedKind {
  pub fn str_value(&self) -> &'static str {
    match self {
      UncheckedKind::Blob => "blob",
      UncheckedKind::Holder => "holder",
    }
  }
}

impl From<UncheckedKind> for AttributeValue {
  fn from(val: UncheckedKind) -> Self {
    AttributeValue::S(val.str_value().to_string())
  }
}

fn is_raw_row_unchecked(
  row: &RawAttributes,
  kind: UncheckedKind,
) -> DBResult<bool> {
  let Some(AttributeValue::S(value)) = row.get(ATTR_UNCHECKED) else {
    // The unchecked attribute not exists
    return Ok(false);
  };

  if value != kind.str_value() {
    // The unchecked attribute exists but has an incorrect value
    return Err(DBError::Attribute(DBItemError::new(
      ATTR_UNCHECKED.to_string(),
      Value::String(value.to_string()),
      comm_lib::database::DBItemAttributeError::IncorrectType,
    )));
  }

  Ok(true)
}
