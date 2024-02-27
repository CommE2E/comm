use lambda_runtime::{service_fn, LambdaEvent};
use reqwest::Response;
use serde::Serialize;
use tracing::{self, Level};
use tracing_subscriber::EnvFilter;

mod constants;
mod error;
mod payload;
mod query;

use error::{Error, RecordError};
use payload::{AttributeValue, EventPayload, OperationType, StreamRecord};
use query::{Match, Query, Script, Term, UpdateByQuery};

#[derive(Serialize, Debug)]
pub struct User {
  #[serde(rename = "userID")]
  pub user_id: String,
  pub username: String,
}

#[tokio::main]
async fn main() -> Result<(), lambda_runtime::Error> {
  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  let subscriber = tracing_subscriber::fmt()
    .with_target(false)
    .without_time()
    .with_env_filter(filter)
    .finish();

  tracing::subscriber::set_global_default(subscriber)
    .map_err(|e| Error::TracingError(e))?;

  let func = service_fn(func);
  lambda_runtime::run(func).await?;

  Ok(())
}

async fn func(event: LambdaEvent<EventPayload>) -> Result<(), error::Error> {
  tracing::debug!("Running in debug mode");

  let endpoint = std::env::var("OPENSEARCH_ENDPOINT")
    .map_err(|e| Error::MissingOpenSearchEndpoint(e))?;

  tracing::info!("endpoint: {:?}", endpoint);

  let (payload, _context) = event.into_parts();
  println!("records: {}", &payload.records.len());

  for record in payload.records {
    let event_name = record
      .event_name
      .ok_or(Error::PayloadError(RecordError::MissingEventName))?;
    let dynamodb = record.dynamodb.ok_or(Error::PayloadError(
      RecordError::MissingDynamoDBStreamRecord,
    ))?;

    let res = match event_name {
      OperationType::Insert => handle_insert(&dynamodb, &endpoint).await,
      OperationType::Modify => handle_modify(&dynamodb, &endpoint).await,
      OperationType::Remove => handle_remove(&dynamodb, &endpoint).await,
    }?;

    match res.status() {
      reqwest::StatusCode::OK | reqwest::StatusCode::CREATED => {
        tracing::info!("Successful identity-search {:?} operation", event_name);
      }
      _ => {
        tracing::error!(
          "failed to update identity-search index, status: {}",
          res.status()
        );

        return Err(Error::UpdateIndexError(res.status()));
      }
    }
  }

  Ok(())
}

async fn update_index(
  url: String,
  json_body: String,
) -> Result<Response, error::Error> {
  let client = reqwest::Client::new();

  client
    .post(url)
    .header(reqwest::header::CONTENT_TYPE, "application/json")
    .body(json_body)
    .send()
    .await
    .map_err(|e| {
      tracing::error!("Reqwest Error: {:?}", e);
      Error::ReqwestError(e)
    })
}

async fn handle_insert(
  dynamodb: &StreamRecord,
  endpoint: &str,
) -> Result<Response, error::Error> {
  tracing::info!("Handle INSERT event");
  let new_image = dynamodb
    .new_image
    .as_ref()
    .ok_or(Error::PayloadError(RecordError::MissingNewImage))?;

  let user_id_attribute = new_image
    .get(constants::DYNAMODB_USER_ID_KEY)
    .ok_or(Error::PayloadError(RecordError::MissingUserId))?;

  let username_attribute = new_image
    .get(constants::DYNAMODB_USERNAME_KEY)
    .ok_or(Error::PayloadError(RecordError::MissingUsername))?;

  let (user_id, username) = match (user_id_attribute, username_attribute) {
    (AttributeValue::S(user_id), AttributeValue::S(username)) => {
      (user_id, username)
    }
    _ => return Err(Error::PayloadError(RecordError::InvalidAttributeType)),
  };

  let user_body = User {
    user_id: user_id.clone(),
    username: username.clone(),
  };

  let json_body = serde_json::to_string(&user_body).map_err(|e| {
    tracing::error!("Serialization Error: {:?}", e);
    Error::SerializationError(e)
  })?;

  let url = format!("https://{}/users/_doc/{}", endpoint, user_body.user_id);

  update_index(url, json_body).await
}

async fn handle_modify(
  dynamodb: &StreamRecord,
  endpoint: &str,
) -> Result<Response, error::Error> {
  tracing::info!("Handle MODIFY event");
  let new_image = dynamodb
    .new_image
    .as_ref()
    .ok_or(Error::PayloadError(RecordError::MissingNewImage))?;

  let user_id_attribute = new_image
    .get(constants::DYNAMODB_USER_ID_KEY)
    .ok_or(Error::PayloadError(RecordError::MissingUserId))?;

  let username_attribute = new_image
    .get(constants::DYNAMODB_USERNAME_KEY)
    .ok_or(Error::PayloadError(RecordError::MissingUsername))?;

  let (user_id, username) = match (user_id_attribute, username_attribute) {
    (AttributeValue::S(user_id), AttributeValue::S(username)) => {
      (user_id, username)
    }
    _ => return Err(Error::PayloadError(RecordError::InvalidAttributeType)),
  };

  let update_by_query = UpdateByQuery {
    query: Query {
      r#match: None,
      term: Some(Term {
        user_id_keyword: user_id.clone(),
      }),
    },
    script: Some(Script {
      source: format!("ctx._source.username = \"{}\"", username),
      lang: "painless".to_string(),
    }),
  };

  let json_body = serde_json::to_string(&update_by_query).map_err(|e| {
    tracing::error!("Serialization Error: {:?}", e);
    Error::SerializationError(e)
  })?;

  let url = format!("https://{}/users/_update_by_query/", endpoint);

  update_index(url, json_body).await
}

async fn handle_remove(
  dynamodb: &StreamRecord,
  endpoint: &str,
) -> Result<Response, error::Error> {
  tracing::info!("Handle REMOVE event");
  let old_image = dynamodb
    .old_image
    .as_ref()
    .ok_or(Error::PayloadError(RecordError::MissingOldImage))?;

  let user_id_attribute = old_image
    .get(constants::DYNAMODB_USER_ID_KEY)
    .ok_or(Error::PayloadError(RecordError::MissingUserId))?;
  let user_id = match user_id_attribute {
    AttributeValue::S(user_id) => user_id,
    _ => return Err(Error::PayloadError(RecordError::InvalidAttributeType)),
  };

  let update_by_query = UpdateByQuery {
    query: Query {
      r#match: Some(Match {
        user_id: user_id.clone(),
      }),
      term: None,
    },
    script: None,
  };

  let json_body = serde_json::to_string(&update_by_query).map_err(|e| {
    tracing::error!("Serialization Error: {:?}", e);
    Error::SerializationError(e)
  })?;
  let url = format!("https://{}/users/_delete_by_query/", endpoint);

  update_index(url, json_body).await
}
