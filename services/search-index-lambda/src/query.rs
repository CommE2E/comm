use serde::Serialize;

#[derive(Serialize)]
pub struct UpdateByQuery {
  pub query: Query,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub script: Option<Script>,
}

#[derive(Serialize)]
pub struct Script {
  pub source: String,
  pub lang: String,
}

#[derive(Serialize)]
pub struct Query {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub r#match: Option<Match>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub term: Option<Term>,
}

#[derive(Serialize)]
pub struct Match {
  #[serde(rename = "userID")]
  pub user_id: String,
}

#[derive(Serialize)]
pub struct Term {
  #[serde(rename = "userID.keyword")]
  pub user_id_keyword: String,
}
