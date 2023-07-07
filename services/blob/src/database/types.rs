use aws_sdk_dynamodb::types::AttributeValue;
use chrono::{DateTime, Utc};
use derive_more::Constructor;
use std::collections::HashMap;

use crate::{
  constants::{db::*, BLOB_S3_BUCKET_NAME},
  s3::S3Path,
};

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

  #[allow(unused)]
  fn try_from(attributes: RawAttributes) -> Result<Self, Self::Error> {
    todo!()
  }
}

/// Represents an input payload for inserting a blob item into the database.
/// This contains only the business logic related attributes
#[derive(Debug)]
pub struct BlobItemInput {
  pub blob_hash: String,
  pub s3_path: S3Path,
}

impl BlobItemInput {
  pub fn new(blob_hash: impl Into<String>) -> Self {
    let blob_hash: String = blob_hash.into();
    BlobItemInput {
      blob_hash: blob_hash.clone(),
      s3_path: S3Path {
        bucket_name: BLOB_S3_BUCKET_NAME.into(),
        object_name: blob_hash,
      },
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
}

impl TryFrom<RawAttributes> for BlobItemRow {
  type Error = DBError;

  #[allow(unused)]
  fn try_from(mut attributes: RawAttributes) -> Result<Self, Self::Error> {
    todo!()
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

  #[allow(unused)]
  fn try_from(mut attributes: RawAttributes) -> Result<Self, Self::Error> {
    todo!()
  }
}

/// Represents a composite primary key for a DynamoDB table row
///
/// It implements `TryFrom` and `Into` traits to conveniently use it
/// in DynamoDB queries
#[derive(Clone, Constructor, Debug)]
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
}

impl TryFrom<RawAttributes> for PrimaryKey {
  type Error = DBError;

  #[allow(unused)]
  fn try_from(mut attributes: RawAttributes) -> Result<Self, Self::Error> {
    todo!()
  }
}

// useful for convenient calls:
// ddb.get_item().set_key(Some(partition_key.into()))
impl Into<RawAttributes> for PrimaryKey {
  fn into(self) -> RawAttributes {
    todo!()
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

impl Into<AttributeValue> for UncheckedKind {
  fn into(self) -> AttributeValue {
    AttributeValue::S(self.str_value().to_string())
  }
}
