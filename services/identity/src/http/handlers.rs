use super::{
  errors::{create_error_response, http400},
  ErrorResponse, HttpRequest,
};
use comm_lib::auth::UserIdentity;
use hyper::header::AUTHORIZATION;
use hyper::StatusCode;
use tracing::error;

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
