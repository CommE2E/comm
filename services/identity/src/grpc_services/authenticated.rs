use std::collections::HashMap;

use crate::config::CONFIG;
use crate::grpc_utils::DeviceInfoWithAuth;
use crate::{
  client_service::{
    handle_db_error, CacheExt, UpdateState, WorkflowInProgress,
  },
  constants::request_metadata,
  database::DatabaseClient,
  grpc_services::shared::get_value,
  token::AuthType,
};
use comm_opaque2::grpc::protocol_error_to_grpc_status;
use moka::future::Cache;
use tonic::{Request, Response, Status};

// This must be named client, because generated code from the authenticated
// protobuf file references message structs from the client protobuf file
// with the client:: namespace
use crate::client_service::client_proto as client;

pub mod auth_proto {
  tonic::include_proto!("identity.authenticated");
}
use auth_proto::{
  find_user_id_request, identity_client_service_server::IdentityClientService,
  FindUserIdRequest, FindUserIdResponse, KeyserverKeysResponse,
  OutboundKeyInfo, OutboundKeysForUserRequest, RefreshUserPreKeysRequest,
  UploadOneTimeKeysRequest,
};
use client::{Empty, IdentityKeyInfo};
use tracing::{debug, error};

#[derive(derive_more::Constructor)]
pub struct AuthenticatedService {
  db_client: DatabaseClient,
  cache: Cache<String, WorkflowInProgress>,
}

fn get_auth_info(req: &Request<()>) -> Option<(String, String, String)> {
  debug!("Retrieving auth info for request: {:?}", req);

  let user_id = get_value(req, request_metadata::USER_ID)?;
  let device_id = get_value(req, request_metadata::DEVICE_ID)?;
  let access_token = get_value(req, request_metadata::ACCESS_TOKEN)?;

  Some((user_id, device_id, access_token))
}

pub fn auth_interceptor(
  req: Request<()>,
  db_client: &DatabaseClient,
) -> Result<Request<()>, Status> {
  debug!("Intercepting request to check auth info: {:?}", req);

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
  let user_id = get_value(request, request_metadata::USER_ID)
    .ok_or_else(|| Status::unauthenticated("Missing user_id field"))?;
  let device_id = get_value(request, request_metadata::DEVICE_ID)
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

  async fn get_outbound_keys_for_user(
    &self,
    request: tonic::Request<client::OutboundKeysForUserRequest>,
  ) -> Result<tonic::Response<client::OutboundKeysForUserResponse>, tonic::Status>
  {
    let message = request.into_inner();

    use client::outbound_keys_for_user_request::Identifier;
    let (user_ident, auth_type) = match message.identifier {
      None => {
        return Err(tonic::Status::invalid_argument("no identifier provided"))
      }
      Some(Identifier::Username(username)) => (username, AuthType::Password),
      Some(Identifier::WalletAddress(address)) => (address, AuthType::Wallet),
    };

    let devices_map = self
      .db_client
      .get_keys_for_user(user_ident, &auth_type, true)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| match auth_type {
        AuthType::Password => tonic::Status::not_found("username not found"),
        AuthType::Wallet => {
          tonic::Status::not_found("wallet address not found")
        }
      })?;

    let transformed_devices = devices_map
      .into_iter()
      .filter_map(|(key, device_info)| {
        let device_info_with_auth = DeviceInfoWithAuth {
          device_info,
          auth_type: &auth_type,
        };
        match client::OutboundKeyInfo::try_from(device_info_with_auth) {
          Ok(key_info) => Some((key, key_info)),
          Err(_) => {
            error!("Failed to transform device info for key {}", key);
            None
          }
        }
      })
      .collect::<HashMap<_, _>>();

    Ok(tonic::Response::new(client::OutboundKeysForUserResponse {
      devices: transformed_devices,
    }))
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
        one_time_content_prekey: db_keys.content_one_time_key,
        one_time_notif_prekey: db_keys.notif_one_time_key,
      });

    let response = Response::new(KeyserverKeysResponse {
      keyserver_info: inner_response,
    });

    return Ok(response);
  }

  async fn upload_one_time_keys(
    &self,
    request: tonic::Request<UploadOneTimeKeysRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;
    let message = request.into_inner();

    debug!("Attempting to update one time keys for user: {}", user_id);
    self
      .db_client
      .append_one_time_prekeys(
        device_id,
        message.content_one_time_pre_keys,
        message.notif_one_time_pre_keys,
      )
      .await
      .map_err(handle_db_error)?;

    Ok(tonic::Response::new(Empty {}))
  }

  async fn find_user_id(
    &self,
    request: tonic::Request<FindUserIdRequest>,
  ) -> Result<tonic::Response<FindUserIdResponse>, tonic::Status> {
    let message = request.into_inner();

    use find_user_id_request::Identifier;
    let (user_ident, auth_type) = match message.identifier {
      None => {
        return Err(tonic::Status::invalid_argument("no identifier provided"))
      }
      Some(Identifier::Username(username)) => (username, AuthType::Password),
      Some(Identifier::WalletAddress(address)) => (address, AuthType::Wallet),
    };

    let user_id = self
      .db_client
      .get_user_id_from_user_info(user_ident, &auth_type)
      .await
      .map_err(handle_db_error)?;

    Ok(Response::new(FindUserIdResponse { user_id }))
  }

  async fn update_user_password_start(
    &self,
    request: tonic::Request<auth_proto::UpdateUserPasswordStartRequest>,
  ) -> Result<
    tonic::Response<auth_proto::UpdateUserPasswordStartResponse>,
    tonic::Status,
  > {
    let (user_id, _) = get_user_and_device_id(&request)?;
    let message = request.into_inner();

    let server_registration = comm_opaque2::server::Registration::new();
    let server_message = server_registration
      .start(
        &CONFIG.server_setup,
        &message.opaque_registration_request,
        user_id.as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    let update_state = UpdateState { user_id };
    let session_id = self
      .cache
      .insert_with_uuid_key(WorkflowInProgress::Update(update_state))
      .await;

    let response = auth_proto::UpdateUserPasswordStartResponse {
      session_id,
      opaque_registration_response: server_message,
    };
    Ok(Response::new(response))
  }

  async fn update_user_password_finish(
    &self,
    request: tonic::Request<auth_proto::UpdateUserPasswordFinishRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    let Some(WorkflowInProgress::Update(state)) =
      self.cache.get(&message.session_id)
    else {
      return Err(tonic::Status::not_found("session not found"));
    };

    self.cache.invalidate(&message.session_id).await;

    let server_registration = comm_opaque2::server::Registration::new();
    let password_file = server_registration
      .finish(&message.opaque_registration_upload)
      .map_err(protocol_error_to_grpc_status)?;

    self
      .db_client
      .update_user_password(state.user_id, password_file)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  async fn log_out_user(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;

    self
      .db_client
      .remove_device_from_users_table(user_id.clone(), device_id.clone())
      .await
      .map_err(handle_db_error)?;

    self
      .db_client
      .delete_access_token_data(user_id, device_id)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  async fn delete_user(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;

    self
      .db_client
      .delete_user(user_id)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};
    Ok(Response::new(response))
  }
}
