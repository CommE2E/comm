use crate::{client_service::handle_db_error, database::DatabaseClient};
use tonic::{Request, Response, Status};

// This must be named client, because generated code from the authenticated
// protobuf file references message structs from the client protobuf file
// with the client:: namespace
pub mod client {
  tonic::include_proto!("identity.client");
}
pub mod auth_proto {
  tonic::include_proto!("identity.authenticated");
}
use auth_proto::{
  identity_client_service_server::IdentityClientService,
  RefreshUserPreKeysRequest,
};
use client::Empty;
use tracing::debug;

#[derive(derive_more::Constructor)]
pub struct AuthenticatedService {
  db_client: DatabaseClient,
}

fn get_value<T>(req: &Request<T>, key: &str) -> Option<String> {
  let raw_value = req.metadata().get(key)?;
  raw_value.to_str().ok().map(|s| s.to_string())
}

fn get_auth_info(req: &Request<()>) -> Option<(String, String, String)> {
  debug!("Retrieving auth info for request: {:?}", req);

  let user_id = get_value(req, "user_id")?;
  let device_id = get_value(req, "device_id")?;
  let access_token = get_value(req, "access_token")?;

  Some((user_id, device_id, access_token))
}

pub fn auth_intercept(
  req: Request<()>,
  db_client: &DatabaseClient,
) -> Result<Request<()>, Status> {
  println!("Intercepting request: {:?}", req);

  let (user_id, device_id, access_token) = get_auth_info(&req)
    .ok_or(Status::unauthenticated("Missing credentials"))?;

  let handle = tokio::runtime::Handle::current();
  let new_db_client = db_client.clone();

  // This function cannot be `async`, yet must call the async db call
  // Force tokio to resolve future in current thread without an explicit .await
  let valid_token = tokio::task::block_in_place(move || {
    handle
      .block_on(new_db_client.verify_access_token(
        user_id,
        device_id,
        access_token,
      ))
      .map_err(handle_db_error)
  })?;

  if !valid_token {
    return Err(Status::aborted("Bad Credentials"));
  }

  Ok(req)
}

#[tonic::async_trait]
impl IdentityClientService for AuthenticatedService {
  async fn refresh_user_pre_keys(
    &self,
    _request: Request<RefreshUserPreKeysRequest>,
  ) -> Result<Response<Empty>, Status> {
    unimplemented!();
  }
}
