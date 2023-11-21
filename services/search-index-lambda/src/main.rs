use lambda_runtime::{service_fn, Error, LambdaEvent};
use reqwest::Response;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

const DYNAMODB_OLD_IMAGE_KEY: &str = "OldImage";
const DYNAMODB_NEW_IMAGE_KEY: &str = "NewImage";
const DYNAMODB_USER_ID_KEY: &str = "userID";
const DYNAMODB_USERNAME_KEY: &str = "username";

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

#[tokio::main]
async fn main() -> Result<(), Error> {
  simple_logger::init_with_env().unwrap();

  let func = service_fn(func);
  lambda_runtime::run(func).await?;

  Ok(())
}

async fn func(event: LambdaEvent<Value>) -> Result<(), Error> {
  log::debug!("Running in debug mode");

  let endpoint =  std::env::var("OPENSEARCH_ENDPOINT")
  .expect("An OPENSEARCH_ENDPOINT must be set in this app's Lambda environment variables.");

  log::debug!("endpoint: {:?}", endpoint);

  let (payload, _context) = event.into_parts();
  let records = payload["Records"].as_array().unwrap();

  for record in records {
    let event_name = record["eventName"].as_str().unwrap();
    let dynamodb = record["dynamodb"].as_object().unwrap();

    let res = match event_name {
      "INSERT" => handle_insert(dynamodb, &endpoint).await?,
      "MODIFY" => handle_modify(dynamodb, &endpoint).await?,
      "REMOVE" => handle_remove(dynamodb, &endpoint).await?,
      _ => return Err("unknown stream record event type".into()),
    };

    match res.status() {
      reqwest::StatusCode::OK | reqwest::StatusCode::CREATED => {
        log::debug!("Successful identity-search {} operation", event_name);
      }
      _ => {
        log::error!(
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

fn get_string_attribute(
  field_name: &str,
  image: &Map<String, Value>,
) -> String {
  let user_id_attribute = image[field_name].as_object().unwrap();
  return user_id_attribute["S"].as_str().unwrap().into();
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
  dynamodb: &Map<String, Value>,
  endpoint: &str,
) -> Result<Response, String> {
  log::debug!("Handle INSERT event");
  let new_image = dynamodb[DYNAMODB_NEW_IMAGE_KEY].as_object().unwrap();

  let user_id = get_string_attribute(DYNAMODB_USER_ID_KEY, new_image);
  let username = get_string_attribute(DYNAMODB_USERNAME_KEY, new_image);

  let user_body = User {
    user_id: user_id.clone(),
    username: username,
  };
  let json_body = serde_json::to_string(&user_body).unwrap();

  let url = format!("https://{}/users/_doc/{}", endpoint, user_id);

  send_request(url, json_body).await
}

async fn handle_modify(
  dynamodb: &Map<String, Value>,
  endpoint: &str,
) -> Result<Response, String> {
  log::debug!("Handle MODIFY event");
  // let old_image = dynamodb[DYNAMODB_OLD_IMAGE_KEY].as_object().unwrap();
  let new_image = dynamodb[DYNAMODB_NEW_IMAGE_KEY].as_object().unwrap();

  let user_id = get_string_attribute(DYNAMODB_USER_ID_KEY, new_image);
  let username = get_string_attribute(DYNAMODB_USERNAME_KEY, new_image);

  let update_by_query = UpdateByQuery {
    query: Query {
      r#match: None,
      term: Some(Term { user_id: user_id }),
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
  dynamodb: &Map<String, Value>,
  endpoint: &str,
) -> Result<Response, String> {
  log::debug!("Handle REMOVE event");
  let old_image = dynamodb[DYNAMODB_OLD_IMAGE_KEY].as_object().unwrap();
  let user_id = get_string_attribute(DYNAMODB_USER_ID_KEY, old_image);

  let update_by_query = UpdateByQuery {
    query: Query {
      r#match: Some(Match { user_id: user_id }),
      term: None,
    },
    script: None,
  };

  let json_body = serde_json::to_string(&update_by_query).unwrap();
  let url = format!("https://{}/users/_delete_by_query/", endpoint);

  send_request(url, json_body).await
}
