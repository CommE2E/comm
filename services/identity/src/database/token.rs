use std::collections::HashMap;

use chrono::{DateTime, Utc};
use comm_lib::{
  aws::ddb::{
    operation::{get_item::GetItemOutput, put_item::PutItemOutput},
    types::{AttributeValue, DeleteRequest, WriteRequest},
  },
  database::{
    batch_operations::{batch_write, ExponentialBackoffConfig},
    DBItemAttributeError, DBItemError, TryFromAttribute,
  },
};
use constant_time_eq::constant_time_eq;
use tracing::{error, info};

use crate::{
  error::Error,
  token::{AccessTokenData, AuthType},
};

use super::{create_composite_primary_key, DatabaseClient};

impl DatabaseClient {
  #[tracing::instrument(skip_all)]
  pub async fn get_access_token_data(
    &self,
    user_id: String,
    signing_public_key: String,
  ) -> Result<Option<AccessTokenData>, Error> {
    use crate::constants::token_table::*;

    let primary_key = create_composite_primary_key(
      (PARTITION_KEY.to_string(), user_id.clone()),
      (SORT_KEY.to_string(), signing_public_key.clone()),
    );
    let get_item_result = self
      .client
      .get_item()
      .table_name(NAME)
      .set_key(Some(primary_key))
      .consistent_read(true)
      .send()
      .await;
    match get_item_result {
      Ok(GetItemOutput {
        item: Some(mut item),
        ..
      }) => {
        let created = DateTime::<Utc>::try_from_attr(
          ATTR_CREATED,
          item.remove(ATTR_CREATED),
        )?;
        let auth_type = parse_auth_type_attribute(item.remove(ATTR_AUTH_TYPE))?;
        let valid = parse_valid_attribute(item.remove(ATTR_VALID))?;
        let access_token = parse_token_attribute(item.remove(ATTR_TOKEN))?;
        Ok(Some(AccessTokenData {
          user_id,
          signing_public_key,
          access_token,
          created,
          auth_type,
          valid,
        }))
      }
      Ok(_) => {
        info!(
          "No item found for user {} and signing public key {} in token table",
          user_id, signing_public_key
        );
        Ok(None)
      }
      Err(e) => {
        error!(
          "DynamoDB client failed to get token for user {} with signing public key {}: {}",
          user_id, signing_public_key, e
        );
        Err(Error::AwsSdk(e.into()))
      }
    }
  }

  pub async fn verify_access_token(
    &self,
    user_id: String,
    signing_public_key: String,
    access_token_to_verify: String,
  ) -> Result<bool, Error> {
    let is_valid = self
      .get_access_token_data(user_id, signing_public_key)
      .await?
      .map(|access_token_data| {
        constant_time_eq(
          access_token_data.access_token.as_bytes(),
          access_token_to_verify.as_bytes(),
        ) && access_token_data.is_valid()
      })
      .unwrap_or(false);

    Ok(is_valid)
  }

  pub async fn put_access_token_data(
    &self,
    access_token_data: AccessTokenData,
  ) -> Result<PutItemOutput, Error> {
    use crate::constants::token_table::*;

    let item = HashMap::from([
      (
        PARTITION_KEY.to_string(),
        AttributeValue::S(access_token_data.user_id),
      ),
      (
        SORT_KEY.to_string(),
        AttributeValue::S(access_token_data.signing_public_key),
      ),
      (
        ATTR_TOKEN.to_string(),
        AttributeValue::S(access_token_data.access_token),
      ),
      (
        ATTR_CREATED.to_string(),
        AttributeValue::S(access_token_data.created.to_rfc3339()),
      ),
      (
        ATTR_AUTH_TYPE.to_string(),
        AttributeValue::S(match access_token_data.auth_type {
          AuthType::Password => "password".to_string(),
          AuthType::Wallet => "wallet".to_string(),
        }),
      ),
      (
        ATTR_VALID.to_string(),
        AttributeValue::Bool(access_token_data.valid),
      ),
    ]);
    self
      .client
      .put_item()
      .table_name(NAME)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))
  }

  pub async fn delete_access_token_data(
    &self,
    user_id: String,
    device_id_key: String,
  ) -> Result<(), Error> {
    use crate::constants::token_table::*;

    self
      .client
      .delete_item()
      .table_name(NAME)
      .key(PARTITION_KEY.to_string(), AttributeValue::S(user_id))
      .key(SORT_KEY.to_string(), AttributeValue::S(device_id_key))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    Ok(())
  }

  #[tracing::instrument(skip_all)]
  pub async fn delete_all_tokens_for_user(
    &self,
    user_id: &str,
  ) -> Result<(), Error> {
    use crate::constants::token_table::*;

    let primary_keys = self
      .client
      .query()
      .table_name(NAME)
      .projection_expression("#pk, #sk")
      .key_condition_expression("#pk = :pk")
      .expression_attribute_names("#pk", PARTITION_KEY)
      .expression_attribute_names("#sk", SORT_KEY)
      .expression_attribute_values(
        ":pk",
        AttributeValue::S(user_id.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("Failed to list user's items in tokens table: {:?}", e);
        Error::AwsSdk(e.into())
      })?
      .items
      .unwrap_or_default();

    let delete_requests = primary_keys
      .into_iter()
      .map(|item| {
        let request = DeleteRequest::builder().set_key(Some(item)).build();
        WriteRequest::builder().delete_request(request).build()
      })
      .collect::<Vec<_>>();

    batch_write(
      &self.client,
      NAME,
      delete_requests,
      ExponentialBackoffConfig::default(),
    )
    .await
    .map_err(Error::from)?;

    Ok(())
  }
}

fn parse_auth_type_attribute(
  attribute: Option<AttributeValue>,
) -> Result<AuthType, DBItemError> {
  use crate::constants::token_table::ATTR_AUTH_TYPE;

  if let Some(AttributeValue::S(auth_type)) = &attribute {
    match auth_type.as_str() {
      "password" => Ok(AuthType::Password),
      "wallet" => Ok(AuthType::Wallet),
      _ => Err(DBItemError::new(
        ATTR_AUTH_TYPE.to_string(),
        attribute.into(),
        DBItemAttributeError::IncorrectType,
      )),
    }
  } else {
    Err(DBItemError::new(
      ATTR_AUTH_TYPE.to_string(),
      attribute.into(),
      DBItemAttributeError::Missing,
    ))
  }
}

fn parse_valid_attribute(
  attribute: Option<AttributeValue>,
) -> Result<bool, DBItemError> {
  use crate::constants::token_table::ATTR_VALID;

  match attribute {
    Some(AttributeValue::Bool(valid)) => Ok(valid),
    Some(_) => Err(DBItemError::new(
      ATTR_VALID.to_string(),
      attribute.into(),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      ATTR_VALID.to_string(),
      attribute.into(),
      DBItemAttributeError::Missing,
    )),
  }
}

fn parse_token_attribute(
  attribute: Option<AttributeValue>,
) -> Result<String, DBItemError> {
  use crate::constants::token_table::ATTR_TOKEN;

  match attribute {
    Some(AttributeValue::S(token)) => Ok(token),
    Some(_) => Err(DBItemError::new(
      ATTR_TOKEN.to_string(),
      attribute.into(),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      ATTR_TOKEN.to_string(),
      attribute.into(),
      DBItemAttributeError::Missing,
    )),
  }
}
