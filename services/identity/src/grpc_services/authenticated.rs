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
  identity_client_service_server::IdentityClientService, KeyserverKeysResponse,
  OutboundKeyInfo, OutboundKeysForUserRequest, RefreshUserPreKeysRequest,
};
use client::{Empty, IdentityKeyInfo};
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
    .ok_or_else(|| Status::unauthenticated("Missing credentials"))?;

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

pub fn get_user_and_device_id<T>(
  request: &Request<T>,
) -> Result<(String, String), Status> {
  let user_id = get_value(request, "user_id")
    .ok_or_else(|| Status::unauthenticated("Missing user_id field"))?;
  let device_id = get_value(request, "device_id")
    .ok_or_else(|| Status::unauthenticated("Missing device_id field"))?;

  Ok((user_id, device_id))
}

#[tonic::async_trait]
impl IdentityClientService for AuthenticatedService {
  async fn refresh_user_pre_keys(
    &self,
    request: Request<RefreshUserPreKeysRequest>,
  ) -> Result<Response<Empty>, Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;
    let message = request.into_inner();

    debug!("Refreshing prekeys for user: {}", user_id);

    let content_keys = message
      .new_content_pre_keys
      .ok_or_else(|| Status::invalid_argument("Missing content keys"))?;
    let notif_keys = message
      .new_notif_pre_keys
      .ok_or_else(|| Status::invalid_argument("Missing notification keys"))?;

    self
      .db_client
      .set_prekey(
        user_id,
        device_id,
        content_keys.pre_key,
        content_keys.pre_key_signature,
        notif_keys.pre_key,
        notif_keys.pre_key_signature,
      )
      .await
      .map_err(handle_db_error)?;

    let response = Response::new(Empty {});
    Ok(response)
  }

  async fn get_keyserver_keys(
    &self,
    request: Request<OutboundKeysForUserRequest>,
  ) -> Result<Response<KeyserverKeysResponse>, Status> {
    let message = request.into_inner();

    let inner_response = self
      .db_client
      .get_keyserver_keys_for_user(&message.user_id)
      .await
      .map_err(handle_db_error)?
      .map(|db_keys| OutboundKeyInfo {
        identity_info: Some(IdentityKeyInfo {
          payload: db_keys.key_payload,
          payload_signature: db_keys.key_payload_signature,
          social_proof: db_keys.social_proof,
        }),
        content_prekey: Some(client::PreKey {
          pre_key: db_keys.content_prekey.prekey,
          pre_key_signature: db_keys.content_prekey.prekey_signature,
        }),
        notif_prekey: Some(client::PreKey {
          pre_key: db_keys.notif_prekey.prekey,
          pre_key_signature: db_keys.notif_prekey.prekey_signature,
        }),
        onetime_content_prekey: db_keys.content_one_time_key,
        onetime_notif_prekey: db_keys.notif_one_time_key,
      });

    let response = Response::new(KeyserverKeysResponse {
      keyserver_info: inner_response,
    });

    return Ok(response);
  }
}
