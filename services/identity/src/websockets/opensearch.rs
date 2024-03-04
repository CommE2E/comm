use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct OpenSearchResponse<T> {
  pub hits: HitsWrapper<T>,
}

#[derive(Deserialize, Debug)]
pub struct HitsWrapper<T> {
  #[serde(rename = "hits")]
  pub inner: Vec<Hit<T>>,
}

#[derive(Deserialize, Debug)]
pub struct Hit<T> {
  #[serde(rename = "_source")]
  pub source: Option<T>,
}
