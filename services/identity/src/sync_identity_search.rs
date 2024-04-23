use crate::config::CONFIG;
use crate::constants::IDENTITY_SEARCH_INDEX;
use crate::database::DatabaseClient;
use crate::error;
use identity_search_messages::IdentitySearchUser;
use serde_json::json;
use tracing::error;

pub async fn sync_index(
  database_client: &DatabaseClient,
) -> Result<(), error::Error> {
  let identity_reserved_users =
    database_client.get_all_reserved_user_details().await?;
  let identity_users = database_client.get_all_user_details().await?;

  let mut identity_search_users: Vec<IdentitySearchUser> =
    identity_reserved_users
      .into_iter()
      .map(|user| IdentitySearchUser {
        username: user.username,
        user_id: user.user_id,
      })
      .collect();

  for user in identity_users {
    identity_search_users.push(IdentitySearchUser {
      username: user.username,
      user_id: user.user_id,
    });
  }

  let client = reqwest::Client::new();

  clear_index(&client).await?;
  restore_index(&client, &identity_search_users).await?;

  Ok(())
}

pub async fn clear_index(
  reqwest_client: &reqwest::Client,
) -> Result<(), error::Error> {
  let url = format!(
    "https://{}/{}/_delete_by_query",
    &CONFIG.opensearch_endpoint, IDENTITY_SEARCH_INDEX
  );

  let query = serde_json::json!({
    "query": {
        "match_all": {}
    }
  });

  let response = reqwest_client
    .post(&url)
    .header(reqwest::header::CONTENT_TYPE, "application/json")
    .json(&query)
    .send()
    .await
    .expect("Failed to send clear index request");

  if !response.status().is_success() {
    error!("Sync Error: Failed to clear index");
  }

  Ok(())
}

pub async fn restore_index(
  reqwest_client: &reqwest::Client,
  identity_search_users: &Vec<IdentitySearchUser>,
) -> Result<(), error::Error> {
  let mut bulk_data = String::new();

  for user in identity_search_users {
    let action = json!({ "index": { "_index": IDENTITY_SEARCH_INDEX, "_id": user.user_id } });
    bulk_data.push_str(&action.to_string());
    bulk_data.push('\n');

    bulk_data.push_str(
      &serde_json::to_string(&user)
        .expect("Failed to serialize identity search index user"),
    );
    bulk_data.push('\n');
  }

  let url = format!(
    "https://{}/{}/_bulk/",
    &CONFIG.opensearch_endpoint, IDENTITY_SEARCH_INDEX
  );

  let response = reqwest_client
    .post(&url)
    .header(reqwest::header::CONTENT_TYPE, "application/x-ndjson")
    .body(bulk_data)
    .send()
    .await
    .expect("Failed to send restore index request");

  if !response.status().is_success() {
    error!("Sync Error: Failed to restore index");
  }

  Ok(())
}
