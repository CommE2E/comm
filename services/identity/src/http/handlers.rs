use super::{
  errors::{create_error_response, http400, http404},
  utils::{RequestExt, ResponseExt},
  ErrorResponse, HttpRequest, HttpResponse,
};
use comm_lib::auth::UserIdentity;
use hyper::header::AUTHORIZATION;
use hyper::StatusCode;
use serde_json::json;
use tracing::error;

#[tracing::instrument(skip_all)]
pub async fn inbound_keys_handler(
  req: HttpRequest,
  db_client: crate::DatabaseClient,
) -> Result<HttpResponse, ErrorResponse> {
  verify_csat(&req, &db_client).await?;

  let query_args = req.query_string_args();
  let user_id = query_args
    .get("user_id")
    .ok_or_else(|| http400("missing user_id query param"))?;

  let devices_map = db_client
    .get_keys_for_user(user_id, false)
    .await?
    .ok_or_else(|| http404("user not found"))?;

  let identifier = db_client
    .get_user_identity(user_id)
    .await?
    .ok_or_else(|| http404("user not found"))?;

  let response_json = json!({
    "devices": devices_map,
    "identity": identifier
  });
  HttpResponse::from_json(&response_json)
}

#[tracing::instrument(skip_all)]
async fn verify_csat(
  req: &HttpRequest,
  db_client: &crate::DatabaseClient,
) -> Result<(), ErrorResponse> {
  let Some(auth_header) = req.headers().get(AUTHORIZATION) else {
    return Err(create_error_response(
      StatusCode::UNAUTHORIZED,
      "missing Authorization header",
    ));
  };

  let bearer_token = auth_header
    .to_str()
    .map_err(|_| http400("malfolmed Authorization header"))?
    .strip_prefix("Bearer ")
    .ok_or_else(|| http400("malfolmed Authorization header"))?;

  let UserIdentity {
    user_id,
    device_id,
    access_token,
  } = bearer_token
    .parse()
    .map_err(|_| http400("malfolmed Authorization header"))?;

  let result = db_client
    .verify_access_token(user_id, device_id, access_token)
    .await;
  match result {
    Ok(true) => Ok(()),
    Ok(false) => Err(create_error_response(
      StatusCode::FORBIDDEN,
      "invalid credentials",
    )),
    Err(err) => {
      error!("CSAT verification error: {err:?}");
      Err(err.into())
    }
  }
}
