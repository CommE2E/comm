use std::collections::HashMap;

use crate::config::CONFIG;
use crate::database::DeviceListUpdate;
use crate::device_list::SignedDeviceList;
use crate::{
  client_service::{handle_db_error, UpdateState, WorkflowInProgress},
  constants::{error_types, request_metadata},
  database::DatabaseClient,
  ddb_utils::DateTimeExt,
  grpc_services::shared::get_value,
};
use chrono::{DateTime, Utc};
use comm_opaque2::grpc::protocol_error_to_grpc_status;
use tonic::{Request, Response, Status};
use tracing::{debug, error, trace, warn};

use super::protos::auth::{
  identity_client_service_server::IdentityClientService,
  DeletePasswordUserFinishRequest, DeletePasswordUserStartRequest,
  DeletePasswordUserStartResponse, GetDeviceListRequest, GetDeviceListResponse,
  InboundKeyInfo, InboundKeysForUserRequest, InboundKeysForUserResponse,
  KeyserverKeysResponse, LinkFarcasterAccountRequest, OutboundKeyInfo,
  OutboundKeysForUserRequest, OutboundKeysForUserResponse,
  PeersDeviceListsRequest, PeersDeviceListsResponse, RefreshUserPrekeysRequest,
  UpdateDeviceListRequest, UpdateUserPasswordFinishRequest,
  UpdateUserPasswordStartRequest, UpdateUserPasswordStartResponse,
  UploadOneTimeKeysRequest, UserIdentitiesRequest, UserIdentitiesResponse,
};
use super::protos::unauth::Empty;

#[derive(derive_more::Constructor)]
pub struct AuthenticatedService {
  db_client: DatabaseClient,
}

fn get_auth_info(req: &Request<()>) -> Option<(String, String, String)> {
  trace!("Retrieving auth info for request: {:?}", req);

  let user_id = get_value(req, request_metadata::USER_ID)?;
  let device_id = get_value(req, request_metadata::DEVICE_ID)?;
  let access_token = get_value(req, request_metadata::ACCESS_TOKEN)?;

  Some((user_id, device_id, access_token))
}

pub fn auth_interceptor(
  req: Request<()>,
  db_client: &DatabaseClient,
) -> Result<Request<()>, Status> {
  trace!("Intercepting request to check auth info: {:?}", req);

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
  #[tracing::instrument(skip_all)]
  async fn refresh_user_prekeys(
    &self,
    request: Request<RefreshUserPrekeysRequest>,
  ) -> Result<Response<Empty>, Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;
    let message = request.into_inner();

    debug!("Refreshing prekeys for user: {}", user_id);

    let content_keys = message
      .new_content_prekeys
      .ok_or_else(|| Status::invalid_argument("Missing content keys"))?;
    let notif_keys = message
      .new_notif_prekeys
      .ok_or_else(|| Status::invalid_argument("Missing notification keys"))?;

    self
      .db_client
      .update_device_prekeys(
        user_id,
        device_id,
        content_keys.into(),
        notif_keys.into(),
      )
      .await
      .map_err(handle_db_error)?;

    let response = Response::new(Empty {});
    Ok(response)
  }

  #[tracing::instrument(skip_all)]
  async fn get_outbound_keys_for_user(
    &self,
    request: tonic::Request<OutboundKeysForUserRequest>,
  ) -> Result<tonic::Response<OutboundKeysForUserResponse>, tonic::Status> {
    let message = request.into_inner();
    let user_id = &message.user_id;

    let devices_map = self
      .db_client
      .get_keys_for_user(user_id, true)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| tonic::Status::not_found("user not found"))?;

    let transformed_devices = devices_map
      .into_iter()
      .map(|(key, device_info)| (key, OutboundKeyInfo::from(device_info)))
      .collect::<HashMap<_, _>>();

    Ok(tonic::Response::new(OutboundKeysForUserResponse {
      devices: transformed_devices,
    }))
  }

  #[tracing::instrument(skip_all)]
  async fn get_inbound_keys_for_user(
    &self,
    request: tonic::Request<InboundKeysForUserRequest>,
  ) -> Result<tonic::Response<InboundKeysForUserResponse>, tonic::Status> {
    let message = request.into_inner();
    let user_id = &message.user_id;

    let devices_map = self
      .db_client
      .get_keys_for_user(user_id, false)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| tonic::Status::not_found("user not found"))?;

    let transformed_devices = devices_map
      .into_iter()
      .map(|(key, device_info)| (key, InboundKeyInfo::from(device_info)))
      .collect::<HashMap<_, _>>();

    let identifier = self
      .db_client
      .get_user_identity(user_id)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| tonic::Status::not_found("user not found"))?;

    Ok(tonic::Response::new(InboundKeysForUserResponse {
      devices: transformed_devices,
      identity: Some(identifier.into()),
    }))
  }

  #[tracing::instrument(skip_all)]
  async fn get_keyserver_keys(
    &self,
    request: Request<OutboundKeysForUserRequest>,
  ) -> Result<Response<KeyserverKeysResponse>, Status> {
    let message = request.into_inner();

    let identifier = self
      .db_client
      .get_user_identity(&message.user_id)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| tonic::Status::not_found("user not found"))?;

    let Some(keyserver_info) = self
      .db_client
      .get_keyserver_keys_for_user(&message.user_id)
      .await
      .map_err(handle_db_error)?
    else {
      return Err(Status::not_found("keyserver not found"));
    };

    let primary_device_data = self
      .db_client
      .get_primary_device_data(&message.user_id)
      .await
      .map_err(handle_db_error)?;
    let primary_device_keys = primary_device_data.device_key_info;

    let response = Response::new(KeyserverKeysResponse {
      keyserver_info: Some(keyserver_info.into()),
      identity: Some(identifier.into()),
      primary_device_identity_info: Some(primary_device_keys.into()),
    });

    return Ok(response);
  }

  #[tracing::instrument(skip_all)]
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
        &user_id,
        &device_id,
        &message.content_one_time_prekeys,
        &message.notif_one_time_prekeys,
      )
      .await
      .map_err(handle_db_error)?;

    Ok(tonic::Response::new(Empty {}))
  }

  #[tracing::instrument(skip_all)]
  async fn update_user_password_start(
    &self,
    request: tonic::Request<UpdateUserPasswordStartRequest>,
  ) -> Result<tonic::Response<UpdateUserPasswordStartResponse>, tonic::Status>
  {
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
      .db_client
      .insert_workflow(WorkflowInProgress::Update(update_state))
      .await
      .map_err(handle_db_error)?;

    let response = UpdateUserPasswordStartResponse {
      session_id,
      opaque_registration_response: server_message,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn update_user_password_finish(
    &self,
    request: tonic::Request<UpdateUserPasswordFinishRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    let Some(WorkflowInProgress::Update(state)) = self
      .db_client
      .get_workflow(message.session_id)
      .await
      .map_err(handle_db_error)?
    else {
      return Err(tonic::Status::not_found("session not found"));
    };

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

  #[tracing::instrument(skip_all)]
  async fn log_out_user(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;

    self
      .db_client
      .remove_device(&user_id, &device_id)
      .await
      .map_err(handle_db_error)?;

    self
      .db_client
      .delete_otks_table_rows_for_user_device(&user_id, &device_id)
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

  #[tracing::instrument(skip_all)]
  async fn log_out_secondary_device(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    Err(tonic::Status::unimplemented(""))
  }

  #[tracing::instrument(skip_all)]
  async fn delete_wallet_user(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;

    debug!("Attempting to delete wallet user: {}", user_id);

    self
      .db_client
      .delete_user(user_id)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn delete_password_user_start(
    &self,
    request: tonic::Request<DeletePasswordUserStartRequest>,
  ) -> Result<tonic::Response<DeletePasswordUserStartResponse>, tonic::Status>
  {
    let (user_id, _) = get_user_and_device_id(&request)?;
    let message = request.into_inner();

    debug!("Attempting to start deleting password user: {}", user_id);
    let maybe_username_and_password_file = self
      .db_client
      .get_username_and_password_file(&user_id)
      .await
      .map_err(handle_db_error)?;

    let Some((username, password_file_bytes)) =
      maybe_username_and_password_file
    else {
      return Err(tonic::Status::not_found("user not found"));
    };

    let mut server_login = comm_opaque2::server::Login::new();
    let server_response = server_login
      .start(
        &CONFIG.server_setup,
        &password_file_bytes,
        &message.opaque_login_request,
        username.as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    let delete_state = construct_delete_password_user_info(server_login);

    let session_id = self
      .db_client
      .insert_workflow(WorkflowInProgress::PasswordUserDeletion(Box::new(
        delete_state,
      )))
      .await
      .map_err(handle_db_error)?;

    let response = Response::new(DeletePasswordUserStartResponse {
      session_id,
      opaque_login_response: server_response,
    });
    Ok(response)
  }

  #[tracing::instrument(skip_all)]
  async fn delete_password_user_finish(
    &self,
    request: tonic::Request<DeletePasswordUserFinishRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;
    let message = request.into_inner();

    debug!("Attempting to finish deleting password user: {}", user_id);
    let Some(WorkflowInProgress::PasswordUserDeletion(state)) = self
      .db_client
      .get_workflow(message.session_id)
      .await
      .map_err(handle_db_error)?
    else {
      return Err(tonic::Status::not_found("session not found"));
    };

    let mut server_login = state.opaque_server_login;
    server_login
      .finish(&message.opaque_login_upload)
      .map_err(protocol_error_to_grpc_status)?;

    self
      .db_client
      .delete_user(user_id)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn get_device_list_for_user(
    &self,
    request: tonic::Request<GetDeviceListRequest>,
  ) -> Result<tonic::Response<GetDeviceListResponse>, tonic::Status> {
    let GetDeviceListRequest {
      user_id,
      since_timestamp,
    } = request.into_inner();

    let since = since_timestamp
      .map(|timestamp| {
        DateTime::<Utc>::from_utc_timestamp_millis(timestamp)
          .ok_or_else(|| tonic::Status::invalid_argument("Invalid timestamp"))
      })
      .transpose()?;

    let mut db_result = self
      .db_client
      .get_device_list_history(user_id, since)
      .await
      .map_err(handle_db_error)?;

    // these should be sorted already, but just in case
    db_result.sort_by_key(|list| list.timestamp);

    let device_list_updates: Vec<SignedDeviceList> = db_result
      .into_iter()
      .map(SignedDeviceList::try_from)
      .collect::<Result<Vec<_>, _>>()?;

    let stringified_updates = device_list_updates
      .iter()
      .map(SignedDeviceList::as_json_string)
      .collect::<Result<Vec<_>, _>>()?;

    Ok(Response::new(GetDeviceListResponse {
      device_list_updates: stringified_updates,
    }))
  }

  #[tracing::instrument(skip_all)]
  async fn get_device_lists_for_users(
    &self,
    request: tonic::Request<PeersDeviceListsRequest>,
  ) -> Result<tonic::Response<PeersDeviceListsResponse>, tonic::Status> {
    let PeersDeviceListsRequest { user_ids } = request.into_inner();

    // do all fetches concurrently
    let mut fetch_tasks = tokio::task::JoinSet::new();
    let mut device_lists = HashMap::with_capacity(user_ids.len());
    for user_id in user_ids {
      let db_client = self.db_client.clone();
      fetch_tasks.spawn(async move {
        let result = db_client.get_current_device_list(&user_id).await;
        (user_id, result)
      });
    }

    while let Some(task_result) = fetch_tasks.join_next().await {
      match task_result {
        Ok((user_id, Ok(Some(device_list_row)))) => {
          let signed_list = SignedDeviceList::try_from(device_list_row)?;
          let serialized_list = signed_list.as_json_string()?;
          device_lists.insert(user_id, serialized_list);
        }
        Ok((user_id, Ok(None))) => {
          warn!(user_id, "User has no device list, skipping!");
        }
        Ok((user_id, Err(err))) => {
          error!(
            user_id,
            errorType = error_types::GRPC_SERVICES_LOG,
            "Failed fetching device list: {err}"
          );
          // abort fetching other users
          fetch_tasks.abort_all();
          return Err(handle_db_error(err));
        }
        Err(join_error) => {
          error!(
            errorType = error_types::GRPC_SERVICES_LOG,
            "Failed to join device list task: {join_error}"
          );
          fetch_tasks.abort_all();
          return Err(Status::aborted("unexpected error"));
        }
      }
    }

    let response = PeersDeviceListsResponse {
      users_device_lists: device_lists,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn update_device_list(
    &self,
    request: tonic::Request<UpdateDeviceListRequest>,
  ) -> Result<Response<Empty>, tonic::Status> {
    let (user_id, _device_id) = get_user_and_device_id(&request)?;
    // TODO: when we stop doing "primary device rotation" (migration procedure)
    // we should verify if this RPC is called by primary device only

    let new_list = SignedDeviceList::try_from(request.into_inner())?;
    let update = DeviceListUpdate::try_from(new_list)?;
    self
      .db_client
      .apply_devicelist_update(
        &user_id,
        update,
        crate::device_list::validation::update_device_list_rpc_validator,
      )
      .await
      .map_err(handle_db_error)?;

    Ok(Response::new(Empty {}))
  }

  #[tracing::instrument(skip_all)]
  async fn link_farcaster_account(
    &self,
    request: tonic::Request<LinkFarcasterAccountRequest>,
  ) -> Result<Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;
    let message = request.into_inner();

    let mut get_farcaster_users_response = self
      .db_client
      .get_farcaster_users(vec![message.farcaster_id.clone()])
      .await
      .map_err(handle_db_error)?;

    if get_farcaster_users_response.len() > 1 {
      error!(
        errorType = error_types::GRPC_SERVICES_LOG,
        "multiple users associated with the same Farcaster ID"
      );
      return Err(Status::failed_precondition("cannot link Farcaster ID"));
    }

    if let Some(u) = get_farcaster_users_response.pop() {
      if u.0.user_id == user_id {
        return Ok(Response::new(Empty {}));
      } else {
        return Err(Status::already_exists(
          "farcaster ID already associated with different user",
        ));
      }
    }

    self
      .db_client
      .add_farcaster_id(user_id, message.farcaster_id)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn unlink_farcaster_account(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;

    self
      .db_client
      .remove_farcaster_id(user_id)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn find_user_identities(
    &self,
    request: tonic::Request<UserIdentitiesRequest>,
  ) -> Result<Response<UserIdentitiesResponse>, tonic::Status> {
    let message = request.into_inner();

    let results = self
      .db_client
      .find_db_user_identities(message.user_ids)
      .await
      .map_err(handle_db_error)?;

    let mapped_results = results
      .into_iter()
      .map(|(user_id, identifier)| (user_id, identifier.into()))
      .collect();

    let response = UserIdentitiesResponse {
      identities: mapped_results,
    };
    return Ok(Response::new(response));
  }
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct DeletePasswordUserInfo {
  pub opaque_server_login: comm_opaque2::server::Login,
}

fn construct_delete_password_user_info(
  opaque_server_login: comm_opaque2::server::Login,
) -> DeletePasswordUserInfo {
  DeletePasswordUserInfo {
    opaque_server_login,
  }
}
