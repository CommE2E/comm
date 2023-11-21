use lambda_runtime::{service_fn, Error, LambdaEvent};
use reqwest::Response;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{self, Level};
use tracing_subscriber::EnvFilter;

mod constants;

#[derive(Deserialize, Serialize, Debug)]
struct User {
  #[serde(rename = "userID")]
  user_id: String,
  username: String,
}

#[derive(Serialize, Deserialize)]
struct UpdateByQuery {
  query: Query,

  #[serde(skip_serializing_if = "Option::is_none")]
  script: Option<Script>,
}

#[derive(Serialize, Deserialize)]
struct Script {
  source: String,
  lang: String,
}

#[derive(Serialize, Deserialize)]
struct Query {
  #[serde(skip_serializing_if = "Option::is_none")]
  r#match: Option<Match>,

  #[serde(skip_serializing_if = "Option::is_none")]
  term: Option<Term>,
}

#[derive(Deserialize, Serialize)]
struct Match {
  #[serde(rename = "userID")]
  user_id: String,
}

#[derive(Deserialize, Serialize)]
struct Term {
  #[serde(rename = "userID")]
  user_id: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "UPPERCASE")]
enum EventName {
  Insert,
  Modify,
  Remove,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct StreamRecord {
  new_image: Option<HashMap<String, AttributeValue>>,
  old_image: Option<HashMap<String, AttributeValue>>,
}

#[derive(Deserialize)]
enum AttributeValue {
  Bool(bool),
  L(Vec<AttributeValue>),
  M(HashMap<String, AttributeValue>),
  N(String),
  Ns(Vec<String>),
  Null(bool),
  S(String),
  Ss(Vec<String>),
  #[non_exhaustive]
  Unknown,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "UPPERCASE")]
enum OperationType {
  Insert,
  Modify,
  Remove,
}

#[derive(Deserialize)]
struct Record {
  #[serde(rename = "eventName")]
  event_name: Option<OperationType>,
  dynamodb: Option<StreamRecord>,
}

#[derive(Deserialize)]
struct EventPayload {
  #[serde(rename = "Records")]
  records: Vec<Record>,
}

#[tokio::main]
async fn main() -> Result<(), Error> {
  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
  tracing::subscriber::set_global_default(subscriber)
    .expect("Unable to configure tracing");

  let func = service_fn(func);
  lambda_runtime::run(func).await?;

  Ok(())
}

async fn func(event: LambdaEvent<EventPayload>) -> Result<(), Error> {
  tracing::info!("Running in debug mode");

  let endpoint =  std::env::var("OPENSEARCH_ENDPOINT")
  .expect("An OPENSEARCH_ENDPOINT must be set in this app's Lambda environment variables.");

  tracing::info!("endpoint: {:?}", endpoint);

  let (payload, _context) = event.into_parts();
  println!("records: {}", &payload.records.len());

  for record in payload.records {
    let event_name = record.event_name.expect("failed to get event name");
    let dynamodb = record
      .dynamodb
      .expect("failed to get dynamodb StreamRecord");

    let res = match event_name {
      OperationType::Insert => handle_insert(&dynamodb, &endpoint).await?,
      OperationType::Modify => handle_modify(&dynamodb, &endpoint).await?,
      OperationType::Remove => handle_remove(&dynamodb, &endpoint).await?,
    };

    match res.status() {
      reqwest::StatusCode::OK | reqwest::StatusCode::CREATED => {
        tracing::info!("Successful identity-search {:?} operation", event_name);
      }
      _ => {
        tracing::error!(
          "failed to update identity-search index, status: {}",
          res.status()
        );
        return Err(
          format!(
            "failed to update identity-search index, status: {}",
            res.status()
          )
          .into(),
        );
      }
    }
  }

  Ok(())
}

async fn send_request(
  url: String,
  json_body: String,
) -> Result<Response, String> {
  let client = reqwest::Client::new();

  client
    .post(url)
    .header(reqwest::header::CONTENT_TYPE, "application/json")
    .body(json_body)
    .send()
    .await
    .map_err(|err| {
      format!("failed to update identity-search index, err: {}", err)
    })
}

async fn handle_insert(
  dynamodb: &StreamRecord,
  endpoint: &str,
) -> Result<Response, String> {
  tracing::info!("Handle INSERT event");
  let new_image = dynamodb
    .new_image
    .as_ref()
    .expect("failed to get new image");

  let user_id_attribute = new_image
    .get(constants::DYNAMODB_USER_ID_KEY)
    .expect("failed to get userid");
  let username_attribute = new_image
    .get(constants::DYNAMODB_USERNAME_KEY)
    .expect("failed to get username");

  let (user_id, username) = match (user_id_attribute, username_attribute) {
    (AttributeValue::S(user_id), AttributeValue::S(username)) => {
      (user_id, username)
    }
    _ => {
      return Err(
        "failed to get user_id and username from AttributeValue".into(),
      )
    }
  };

  let user_body = User {
    user_id: user_id.clone(),
    username: username.clone(),
  };

  let json_body = serde_json::to_string(&user_body).unwrap();

  let url = format!("https://{}/users/_doc/{}", endpoint, user_body.user_id);

  send_request(url, json_body).await
}

async fn handle_modify(
  dynamodb: &StreamRecord,
  endpoint: &str,
) -> Result<Response, String> {
  tracing::info!("Handle MODIFY event");
  let new_image = dynamodb
    .new_image
    .as_ref()
    .expect("failed to get new image");

  let user_id_attribute = new_image
    .get(constants::DYNAMODB_USER_ID_KEY)
    .expect("failed to get userid");
  let username_attribute = new_image
    .get(constants::DYNAMODB_USERNAME_KEY)
    .expect("failed to get username");

  let (user_id, username) = match (user_id_attribute, username_attribute) {
    (AttributeValue::S(user_id), AttributeValue::S(username)) => {
      (user_id, username)
    }
    _ => {
      return Err(
        "failed to get user_id and username from AttributeValue".into(),
      )
    }
  };

  let update_by_query = UpdateByQuery {
    query: Query {
      r#match: None,
      term: Some(Term {
        user_id: user_id.clone(),
      }),
    },
    script: Some(Script {
      source: format!("ctx._source.username = \"{}\"", username),
      lang: "painless".to_string(),
    }),
  };

  let json_body = serde_json::to_string(&update_by_query).unwrap();
  let url = format!("https://{}/users/_update_by_query/", endpoint);

  send_request(url, json_body).await
}

async fn handle_remove(
  dynamodb: &StreamRecord,
  endpoint: &str,
) -> Result<Response, String> {
  tracing::info!("Handle REMOVE event");
  let old_image = dynamodb
    .old_image
    .as_ref()
    .expect("failed to get new image");

  let user_id_attribute = old_image
    .get(constants::DYNAMODB_USER_ID_KEY)
    .expect("failed to get userid");
  let user_id = match user_id_attribute {
    AttributeValue::S(user_id) => user_id,
    _ => return Err("failed to get user_id from AttributeValue".into()),
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

  let json_body = serde_json::to_string(&update_by_query).unwrap();
  let url = format!("https://{}/users/_delete_by_query/", endpoint);

  send_request(url, json_body).await
}
