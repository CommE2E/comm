use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Error as DynamoDBError;
use chrono::{DateTime, Utc};
use std::collections::HashSet;
use std::fmt::{Display, Formatter};
use std::num::ParseIntError;
use std::str::FromStr;

// # Useful type aliases

// Rust exports `pub type` only into the so-called "type namespace", but in
// order to use them e.g. with the `TryFromAttribute` trait, they also need
// to be exported into the "value namespace" which is what `pub use` does.
//
// To overcome that, a dummy module is created and aliases are re-exported
// with `pub use` construct
mod aliases {
  use aws_sdk_dynamodb::types::AttributeValue;
  use std::collections::HashMap;
  pub type AttributeMap = HashMap<String, AttributeValue>;
}
pub use self::aliases::AttributeMap;

// # Error handling

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(DynamoDBError),
  #[display(...)]
  Attribute(DBItemError),
  #[display(fmt = "Maximum retries exceeded")]
  MaxRetriesExceeded,
}

#[derive(Debug)]
pub enum Value {
  AttributeValue(Option<AttributeValue>),
  String(String),
}

#[derive(Debug, derive_more::Error, derive_more::Constructor)]
pub struct DBItemError {
  attribute_name: String,
  attribute_value: Value,
  attribute_error: DBItemAttributeError,
}

impl Display for DBItemError {
  fn fmt(&self, f: &mut Formatter) -> std::fmt::Result {
    match &self.attribute_error {
      DBItemAttributeError::Missing => {
        write!(f, "Attribute {} is missing", self.attribute_name)
      }
      DBItemAttributeError::IncorrectType => write!(
        f,
        "Value for attribute {} has incorrect type: {:?}",
        self.attribute_name, self.attribute_value
      ),
      error => write!(
        f,
        "Error regarding attribute {} with value {:?}: {}",
        self.attribute_name, self.attribute_value, error
      ),
    }
  }
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum DBItemAttributeError {
  #[display(...)]
  Missing,
  #[display(...)]
  IncorrectType,
  #[display(...)]
  TimestampOutOfRange,
  #[display(...)]
  InvalidTimestamp(chrono::ParseError),
  #[display(...)]
  InvalidNumberFormat(ParseIntError),
}

/// Conversion trait for [`AttributeValue`]
///
/// Types implementing this trait are able to do the following:
/// ```ignore
/// use comm_services_lib::database::{TryFromAttribute, AttributeTryInto};
///
/// let foo = SomeType::try_from_attr("MyAttribute", Some(attribute))?;
///
/// // if `AttributeTryInto` is imported, also:
/// let bar = Some(attribute).attr_try_into("MyAttribute")?;
/// ```
pub trait TryFromAttribute: Sized {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, DBItemError>;
}

/// Do NOT implement this trait directly. Implement [`TryFromAttribute`] instead
pub trait AttributeTryInto<T> {
  fn attr_try_into(
    self,
    attribute_name: impl Into<String>,
  ) -> Result<T, DBItemError>;
}
// Automatic attr_try_into() for all attribute values
// that have TryFromAttribute implemented
impl<T: TryFromAttribute> AttributeTryInto<T> for Option<AttributeValue> {
  fn attr_try_into(
    self,
    attribute_name: impl Into<String>,
  ) -> Result<T, DBItemError> {
    T::try_from_attr(attribute_name, self)
  }
}

/// Helper trait for extracting attributes from a collection
pub trait AttributeExtractor {
  /// Gets an attribute from the map and tries to convert it to the given type
  /// This method does not consume the raw attribute - it gets cloned
  /// See [`AttributeExtractor::take_attr`] for a non-cloning method
  fn get_attr<T: TryFromAttribute>(
    &self,
    attribute_name: &str,
  ) -> Result<T, DBItemError>;
  /// Takes an attribute from the map and tries to convert it to the given type
  /// This method consumes the raw attribute - it gets removed from the map
  /// See [`AttributeExtractor::get_attr`] for a non-mutating method
  fn take_attr<T: TryFromAttribute>(
    &mut self,
    attribute_name: &str,
  ) -> Result<T, DBItemError>;
}
impl AttributeExtractor for AttributeMap {
  fn get_attr<T: TryFromAttribute>(
    &self,
    attribute_name: &str,
  ) -> Result<T, DBItemError> {
    T::try_from_attr(attribute_name, self.get(attribute_name).cloned())
  }
  fn take_attr<T: TryFromAttribute>(
    &mut self,
    attribute_name: &str,
  ) -> Result<T, DBItemError> {
    T::try_from_attr(attribute_name, self.remove(attribute_name))
  }
}

impl TryFromAttribute for String {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute_value: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match attribute_value {
      Some(AttributeValue::S(value)) => Ok(value),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

impl TryFromAttribute for bool {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute_value: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match attribute_value {
      Some(AttributeValue::Bool(value)) => Ok(value),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

impl TryFromAttribute for DateTime<Utc> {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match &attribute {
      Some(AttributeValue::S(datetime)) => datetime.parse().map_err(|e| {
        DBItemError::new(
          attribute_name.into(),
          Value::AttributeValue(attribute),
          DBItemAttributeError::InvalidTimestamp(e),
        )
      }),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

impl TryFromAttribute for AttributeMap {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute_value: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match attribute_value {
      Some(AttributeValue::M(map)) => Ok(map),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

impl TryFromAttribute for Vec<u8> {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute_value: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match attribute_value {
      Some(AttributeValue::B(data)) => Ok(data.into_inner()),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

impl TryFromAttribute for HashSet<String> {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute_value: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match attribute_value {
      Some(AttributeValue::Ss(set)) => Ok(set.into_iter().collect()),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

#[deprecated = "Use `String::try_from_attr()` instead"]
pub fn parse_string_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<String, DBItemError> {
  String::try_from_attr(attribute_name, attribute_value)
}

#[deprecated = "Use `bool::try_from_attr()` instead"]
pub fn parse_bool_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<bool, DBItemError> {
  bool::try_from_attr(attribute_name, attribute_value)
}

#[deprecated = "Use `DateTime::<Utc>::try_from_attr()` instead"]
pub fn parse_datetime_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  DateTime::<Utc>::try_from_attr(attribute_name, attribute_value)
}

#[deprecated = "Use `AttributeMap::try_from_attr()` instead"]
pub fn parse_map_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<AttributeMap, DBItemError> {
  attribute_value.attr_try_into(attribute_name)
}

pub fn parse_int_attribute<T>(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<T, DBItemError>
where
  T: FromStr<Err = ParseIntError>,
{
  match &attribute_value {
    Some(AttributeValue::N(numeric_str)) => {
      parse_integer(attribute_name, numeric_str)
    }
    Some(_) => Err(DBItemError::new(
      attribute_name.into(),
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      attribute_name.into(),
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::Missing,
    )),
  }
}

/// Parses the UTC timestamp in milliseconds from a DynamoDB numeric attribute
pub fn parse_timestamp_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  let attribute_name: String = attribute_name.into();
  let timestamp = parse_int_attribute::<i64>(
    attribute_name.clone(),
    attribute_value.clone(),
  )?;
  let naive_datetime = chrono::NaiveDateTime::from_timestamp_millis(timestamp)
    .ok_or_else(|| {
      DBItemError::new(
        attribute_name,
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::TimestampOutOfRange,
      )
    })?;
  Ok(DateTime::from_utc(naive_datetime, Utc))
}

pub fn parse_integer<T>(
  attribute_name: impl Into<String>,
  attribute_value: &str,
) -> Result<T, DBItemError>
where
  T: FromStr<Err = ParseIntError>,
{
  attribute_value.parse::<T>().map_err(|e| {
    DBItemError::new(
      attribute_name.into(),
      Value::String(attribute_value.into()),
      DBItemAttributeError::InvalidNumberFormat(e),
    )
  })
}

pub mod batch_operations {
  use aws_sdk_dynamodb::{
    error::SdkError, operation::batch_write_item::BatchWriteItemError,
    types::WriteRequest,
  };
  use rand::Rng;
  use std::time::Duration;
  use tracing::{debug, trace};

  /// DynamoDB hard limit for single BatchWriteItem request
  const SINGLE_BATCH_ITEM_LIMIT: usize = 25;

  /// Exponential backoff configuration for batch write operation
  #[derive(derive_more::Constructor, Debug)]
  pub struct ExponentialBackoffConfig {
    /// Maximum retry attempts before the function fails.
    /// Set this to 0 to disable exponential backoff.
    /// Defaults to **8**.
    pub max_attempts: u32,
    /// Base wait duration before retry. Defaults to **25ms**.
    /// It is doubled with each attempt: 25ms, 50, 100, 200...
    pub base_duration: Duration,
    /// Jitter factor for retry delay. Factor 0.5 for 100ms delay
    /// means that wait time will be between 50ms and 150ms.
    /// The value must be in range 0.0 - 1.0. It will be clamped
    /// if out of these bounds. Defaults to **0.3**
    pub jitter_factor: f32,
    /// Retry on [`ProvisionedThroughputExceededException`].
    /// Defaults to **true**.
    ///
    /// [`ProvisionedThroughputExceededException`]: aws_sdk_dynamodb::Error::ProvisionedThroughputExceededException
    pub retry_on_provisioned_capacity_exceeded: bool,
  }

  impl Default for ExponentialBackoffConfig {
    fn default() -> Self {
      ExponentialBackoffConfig {
        max_attempts: 8,
        base_duration: Duration::from_millis(25),
        jitter_factor: 0.3,
        retry_on_provisioned_capacity_exceeded: true,
      }
    }
  }

  impl ExponentialBackoffConfig {
    fn new_counter(&self) -> ExponentialBackoffHelper {
      ExponentialBackoffHelper::new(self)
    }
    fn backoff_enabled(&self) -> bool {
      self.max_attempts > 0
    }
    fn should_retry_on_capacity_exceeded(&self) -> bool {
      self.backoff_enabled() && self.retry_on_provisioned_capacity_exceeded
    }
  }

  /// Performs a single DynamoDB table batch write operation. If the batch
  /// contains more than 25 items, it is split into chunks.
  ///
  /// The function uses exponential backoff retries when AWS throttles
  /// the request or maximum provisioned capacity is exceeded
  #[tracing::instrument(name = "batch_write", skip(ddb, requests, config))]
  pub async fn batch_write(
    ddb: &aws_sdk_dynamodb::Client,
    table_name: &str,
    mut requests: Vec<WriteRequest>,
    config: ExponentialBackoffConfig,
  ) -> Result<(), super::Error> {
    tracing::debug!(
      ?config,
      "Starting batch write operation of {} items...",
      requests.len()
    );

    let mut exponential_backoff = config.new_counter();
    let mut backup = Vec::with_capacity(SINGLE_BATCH_ITEM_LIMIT);

    loop {
      let items_to_drain =
        std::cmp::min(requests.len(), SINGLE_BATCH_ITEM_LIMIT);
      let chunk = requests.drain(..items_to_drain).collect::<Vec<_>>();
      if chunk.is_empty() {
        // No more items
        tracing::trace!("No more items to process. Exiting");
        break;
      }

      // we don't need the backup when we don't retry
      if config.should_retry_on_capacity_exceeded() {
        chunk.clone_into(&mut backup);
      }

      tracing::trace!("Attempting to write chunk of {} items...", chunk.len());
      let result = ddb
        .batch_write_item()
        .request_items(table_name, chunk)
        .send()
        .await;

      match result {
        Ok(output) => {
          if let Some(mut items) = output.unprocessed_items {
            let requests_to_retry =
              items.remove(table_name).unwrap_or_default();
            if requests_to_retry.is_empty() {
              tracing::trace!("Chunk written successfully. Continuing.");
              exponential_backoff.reset();
              continue;
            }

            exponential_backoff.sleep_and_retry().await?;
            tracing::debug!(
              "Some items failed. Retrying {} requests",
              requests_to_retry.len()
            );
            requests.extend(requests_to_retry);
          } else {
            tracing::trace!("Unprocessed items was None");
          }
        }
        Err(error) => {
          if !is_provisioned_capacity_exceeded(&error) {
            tracing::error!("BatchWriteItem failed: {0:?} - {0}", error);
            return Err(super::Error::AwsSdk(error.into()));
          }

          tracing::warn!("Provisioned capacity exceeded!");
          if !config.retry_on_provisioned_capacity_exceeded {
            return Err(super::Error::AwsSdk(error.into()));
          }
          exponential_backoff.sleep_and_retry().await?;
          requests.append(&mut backup);
          trace!("Retrying now...");
        }
      };
    }

    debug!("Batch write completed.");
    Ok(())
  }

  /// internal helper struct
  struct ExponentialBackoffHelper<'cfg> {
    config: &'cfg ExponentialBackoffConfig,
    attempt: u32,
  }

  impl<'cfg> ExponentialBackoffHelper<'cfg> {
    fn new(config: &'cfg ExponentialBackoffConfig) -> Self {
      ExponentialBackoffHelper { config, attempt: 0 }
    }

    /// reset counter after successfull operation
    fn reset(&mut self) {
      self.attempt = 0;
    }

    /// increase counter and sleep in case of failure
    async fn sleep_and_retry(&mut self) -> Result<(), super::Error> {
      let jitter_factor = 1f32.min(0f32.max(self.config.jitter_factor));
      let random_multiplier =
        1.0 + rand::thread_rng().gen_range(-jitter_factor..=jitter_factor);
      let backoff_multiplier = 2u32.pow(self.attempt);
      let base_duration = self.config.base_duration * backoff_multiplier;
      let sleep_duration = base_duration.mul_f32(random_multiplier);

      self.attempt += 1;
      if self.attempt > self.config.max_attempts {
        tracing::warn!("Retry limit exceeded!");
        return Err(super::Error::MaxRetriesExceeded);
      }
      tracing::debug!(
        attempt = self.attempt,
        "Batch failed. Sleeping for {}ms before retrying...",
        sleep_duration.as_millis()
      );
      tokio::time::sleep(sleep_duration).await;
      Ok(())
    }
  }

  /// Check if transaction failed due to
  /// `ProvisionedThroughputExceededException` exception
  fn is_provisioned_capacity_exceeded(
    err: &SdkError<BatchWriteItemError>,
  ) -> bool {
    let SdkError::ServiceError(service_error) = err else {
      return false;
    };
    matches!(
      service_error.err(),
      BatchWriteItemError::ProvisionedThroughputExceededException(_)
    )
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_parse_integer() {
    assert!(parse_integer::<i32>("some_attr", "123").is_ok());
    assert!(parse_integer::<i32>("negative", "-123").is_ok());

    assert!(parse_integer::<i32>("float", "3.14").is_err());
    assert!(parse_integer::<i32>("NaN", "foo").is_err());

    assert!(parse_integer::<u32>("negative_uint", "-123").is_err());
    assert!(parse_integer::<u8>("too_large", "65536").is_err());
  }

  #[test]
  fn test_parse_timestamp() {
    let timestamp = Utc::now().timestamp_millis();
    let attr = AttributeValue::N(timestamp.to_string());

    let parsed_timestamp = parse_timestamp_attribute("some_attr", Some(attr));

    assert!(parsed_timestamp.is_ok());
    assert_eq!(parsed_timestamp.unwrap().timestamp_millis(), timestamp);
  }

  #[test]
  fn test_parse_invalid_timestamp() {
    let attr = AttributeValue::N("foo".to_string());
    let parsed_timestamp = parse_timestamp_attribute("some_attr", Some(attr));
    assert!(parsed_timestamp.is_err());
  }

  #[test]
  fn test_parse_timestamp_out_of_range() {
    let attr = AttributeValue::N(i64::MAX.to_string());
    let parsed_timestamp = parse_timestamp_attribute("some_attr", Some(attr));
    assert!(parsed_timestamp.is_err());
    assert!(matches!(
      parsed_timestamp.unwrap_err().attribute_error,
      DBItemAttributeError::TimestampOutOfRange
    ));
  }
}
