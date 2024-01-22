use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "UPPERCASE")]
pub enum EventName {
  Insert,
  Modify,
  Remove,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StreamRecord {
  pub new_image: Option<HashMap<String, AttributeValue>>,
  pub old_image: Option<HashMap<String, AttributeValue>>,
}

#[derive(Deserialize)]
pub enum AttributeValue {
  B(String),
  Bool(bool),
  BS(Vec<String>),
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
pub enum OperationType {
  Insert,
  Modify,
  Remove,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Record {
  pub event_name: Option<OperationType>,
  pub dynamodb: Option<StreamRecord>,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EventPayload {
  pub records: Vec<Record>,
}
