use std::collections::{HashMap, HashSet};

use crate::comm_service::{backup, blob, tunnelbroker};
use crate::config::CONFIG;
use crate::database::{DeviceListRow, DeviceListUpdate, PlatformDetails};
use crate::device_list::validation::DeviceListValidator;
use crate::device_list::SignedDeviceList;
use crate::error::consume_error;
use crate::log::redact_sensitive_data;
use crate::token::AuthType;
use crate::{
  client_service::{handle_db_error, WorkflowInProgress},
  constants::{error_types, request_metadata, staff, tonic_status_messages},
  database::DatabaseClient,
  grpc_services::shared::{get_platform_metadata, get_value},
};
use chrono::DateTime;
use comm_lib::auth::{AuthService, ServicesAuthToken};
use comm_lib::blob::client::BlobServiceClient;
use comm_opaque2::grpc::protocol_error_to_grpc_status;
use tonic::{Request, Response, Status};
use tracing::{debug, error, info, trace, warn};

use super::protos::auth::{
  identity_client_service_server::IdentityClientService,
  DeletePasswordUserFinishRequest, DeletePasswordUserStartRequest,
  DeletePasswordUserStartResponse, GetDeviceListRequest, GetDeviceListResponse,
  InboundKeyInfo, InboundKeysForUserRequest, InboundKeysForUserResponse,
  KeyserverKeysResponse, LinkFarcasterAccountRequest, OutboundKeyInfo,
  OutboundKeysForUserRequest, OutboundKeysForUserResponse,
  PeersDeviceListsRequest, PeersDeviceListsResponse,
  PrimaryDeviceLogoutRequest, PrivilegedDeleteUsersRequest,
  PrivilegedResetUserPasswordFinishRequest,
  PrivilegedResetUserPasswordStartRequest,
  PrivilegedResetUserPasswordStartResponse, RefreshUserPrekeysRequest,
  UpdateDeviceListRequest, UpdateUserPasswordFinishRequest,
  UpdateUserPasswordStartRequest, UpdateUserPasswordStartResponse,
  UploadOneTimeKeysRequest, UserDevicesPlatformDetails, UserIdentitiesRequest,
  UserIdentitiesResponse,
};
use super::protos::unauth::Empty;

#[derive(derive_more::Constructor)]
pub struct AuthenticatedService {
  db_client: DatabaseClient,
  blob_client: BlobServiceClient,
  comm_auth_service: AuthService,
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
  auth_service: &comm_lib::auth::AuthService,
) -> Result<Request<()>, Status> {
  use tonic_status_messages as msg;

  trace!("Intercepting request to check auth info: {:?}", req);
  let handle = tokio::runtime::Handle::current();

  if let Some(s2s_token) = get_value(&req, request_metadata::SERVICES_TOKEN) {
    let auth_credential = ServicesAuthToken::new(s2s_token);
    let auth_service = auth_service.clone();

    // This function cannot be `async`, yet must call the async db call
    // Force tokio to resolve future in current thread without an explicit .await
    let verification_result = tokio::task::block_in_place(move || {
      handle
        .block_on(auth_service.verify_auth_credential(&auth_credential.into()))
    });

    return match verification_result {
      Ok(true) => Ok(req),
      Ok(false) => Err(Status::aborted(msg::BAD_CREDENTIALS)),
      Err(err) => {
        tracing::error!(
          errorType = error_types::HTTP_LOG,
          "Failed to verify service-to-service token: {err:?}",
        );
        Err(tonic::Status::aborted(msg::UNEXPECTED_ERROR))
      }
    };
  }

  let (user_id, device_id, access_token) = get_auth_info(&req)
    .ok_or_else(|| Status::unauthenticated(msg::MISSING_CREDENTIALS))?;

  // This function cannot be `async`, yet must call the async db call
  // Force tokio to resolve future in current thread without an explicit .await
  let new_db_client = db_client.clone();
  let valid_token = tokio::task::block_in_place(move || {
    handle.block_on(new_db_client.verify_access_token(
      user_id,
      device_id,
      access_token,
    ))
  })?;

  if !valid_token {
    return Err(Status::aborted(msg::BAD_CREDENTIALS));
  }

  Ok(req)
}

pub fn get_user_and_device_id<T>(
  request: &Request<T>,
) -> Result<(String, String), Status> {
  let user_id =
    get_value(request, request_metadata::USER_ID).ok_or_else(|| {
      Status::unauthenticated(tonic_status_messages::USER_ID_MISSING)
    })?;
  let device_id =
    get_value(request, request_metadata::DEVICE_ID).ok_or_else(|| {
      Status::unauthenticated(tonic_status_messages::DEVICE_ID_MISSING)
    })?;

  Ok((user_id, device_id))
}

fn spawn_delete_devices_services_data_task(
  blob_client: &BlobServiceClient,
  device_ids: Vec<String>,
) {
  let blob_client = blob_client.clone();
  tokio::spawn(async move {
    debug!(
      "Attempting to delete Tunnelbroker data for devices: {:?}",
      device_ids.as_slice()
    );
    let (tunnelbroker_result, blob_result) = tokio::join!(
      tunnelbroker::delete_devices_data(&device_ids),
      blob::remove_holders_for_devices(&blob_client, &device_ids)
    );
    consume_error(tunnelbroker_result);
    consume_error(blob_result);
  });
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

    let content_key = message.new_content_prekey.ok_or_else(|| {
      Status::invalid_argument(tonic_status_messages::MISSING_CONTENT_KEYS)
    })?;
    let notif_key = message.new_notif_prekey.ok_or_else(|| {
      Status::invalid_argument(tonic_status_messages::MISSING_NOTIF_KEYS)
    })?;

    let device_info = self
      .db_client
      .get_device_data(&user_id, &device_id)
      .await?
      .ok_or_else(|| {
        Status::invalid_argument(tonic_status_messages::DEVICE_NOT_FOUND)
      })?;
    let notif_signing_pub_key = device_info
      .device_key_info
      .key_payload()?
      .notification_identity_public_keys
      .ed25519;

    use crate::database::Prekey as DBPrekey;
    let content_prekey = DBPrekey::from(content_key);
    let notif_prekey = DBPrekey::from(notif_key);

    if let Err(err) = content_prekey.verify(&device_id) {
      error!(
        errorType = error_types::GRPC_SERVICES_LOG,
        "Content prekey verification failed: {err}"
      );
      return Err(Status::invalid_argument(
        tonic_status_messages::MALFORMED_KEY,
      ));
    }
    if let Err(err) = notif_prekey.verify(&notif_signing_pub_key) {
      error!(
        errorType = error_types::GRPC_SERVICES_LOG,
        "Notif prekey verification failed: {err}"
      );
      return Err(Status::invalid_argument(
        tonic_status_messages::MALFORMED_KEY,
      ));
    }

    self
      .db_client
      .update_device_prekeys(user_id, device_id, content_prekey, notif_prekey)
      .await?;

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
    let selected_devices = message.selected_devices.iter().collect();

    let devices_map = self
      .db_client
      .get_keys_for_user(user_id, selected_devices, true)
      .await?
      .ok_or_else(|| {
        tonic::Status::not_found(tonic_status_messages::USER_NOT_FOUND)
      })?;

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
    let selected_devices = message.selected_devices.iter().collect();

    let devices_map = self
      .db_client
      .get_keys_for_user(user_id, selected_devices, false)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| {
        tonic::Status::not_found(tonic_status_messages::USER_NOT_FOUND)
      })?;

    let transformed_devices = devices_map
      .into_iter()
      .map(|(key, device_info)| (key, InboundKeyInfo::from(device_info)))
      .collect::<HashMap<_, _>>();

    let identifier = self
      .db_client
      .get_user_identity(user_id)
      .await?
      .ok_or_else(|| {
        tonic::Status::not_found(tonic_status_messages::USER_NOT_FOUND)
      })?;

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
      .await?
      .ok_or_else(|| {
        tonic::Status::not_found(tonic_status_messages::USER_NOT_FOUND)
      })?;

    let Some(keyserver_info) = self
      .db_client
      .get_keyserver_keys_for_user(&message.user_id)
      .await?
    else {
      return Err(Status::not_found(
        tonic_status_messages::KEYSERVER_NOT_FOUND,
      ));
    };

    let response = Response::new(KeyserverKeysResponse {
      keyserver_info: Some(keyserver_info.into()),
      identity: Some(identifier.into()),
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
      .await?;

    Ok(tonic::Response::new(Empty {}))
  }

  #[tracing::instrument(skip_all)]
  async fn update_user_password_start(
    &self,
    request: tonic::Request<UpdateUserPasswordStartRequest>,
  ) -> Result<tonic::Response<UpdateUserPasswordStartResponse>, tonic::Status>
  {
    let (user_id, _) = get_user_and_device_id(&request)?;

    let Some((username, password_file)) = self
      .db_client
      .get_username_and_password_file(&user_id)
      .await?
    else {
      return Err(tonic::Status::permission_denied(
        tonic_status_messages::WALLET_USER,
      ));
    };

    let message = request.into_inner();

    let mut server_login = comm_opaque2::server::Login::new();
    let login_response = server_login
      .start(
        &CONFIG.server_setup,
        &password_file,
        &message.opaque_login_request,
        username.as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    let server_registration = comm_opaque2::server::Registration::new();
    let registration_response = server_registration
      .start(
        &CONFIG.server_setup,
        &message.opaque_registration_request,
        username.as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    let update_state = UpdatePasswordInfo::new(server_login);
    let session_id = self
      .db_client
      .insert_workflow(WorkflowInProgress::Update(Box::new(update_state)))
      .await?;

    let response = UpdateUserPasswordStartResponse {
      session_id,
      opaque_registration_response: registration_response,
      opaque_login_response: login_response,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn update_user_password_finish(
    &self,
    request: tonic::Request<UpdateUserPasswordFinishRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;

    let message = request.into_inner();

    let Some(WorkflowInProgress::Update(state)) =
      self.db_client.get_workflow(message.session_id).await?
    else {
      return Err(tonic::Status::not_found(
        tonic_status_messages::SESSION_NOT_FOUND,
      ));
    };

    let mut server_login = state.opaque_server_login;
    server_login
      .finish(&message.opaque_login_upload)
      .map_err(protocol_error_to_grpc_status)?;

    let server_registration = comm_opaque2::server::Registration::new();
    let password_file = server_registration
      .finish(&message.opaque_registration_upload)
      .map_err(protocol_error_to_grpc_status)?;

    self
      .db_client
      .update_user_password(user_id, password_file)
      .await?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn log_out_user(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;

    let is_new_flow_user = self
      .db_client
      .get_user_login_flow(&user_id)
      .await?
      .is_signed_device_list_flow();

    let is_primary_device_logout = self
      .get_current_device_list(&user_id)
      .await?
      .is_primary_device(&device_id);

    info!(
      user_id = redact_sensitive_data(&user_id),
      is_new_flow_user, is_primary_device_logout, "V1 logout user request."
    );

    // don't update device list for new flow users
    if is_new_flow_user {
      if is_primary_device_logout {
        error!(
          errorType = error_types::GRPC_SERVICES_LOG,
          "New-flow primary device used legacy logout!"
        );
      }

      self
        .db_client
        .remove_device_data(&user_id, &device_id)
        .await?;
    } else {
      self
        .db_client
        .v1_remove_device(&user_id, &device_id)
        .await?;

      if is_primary_device_logout {
        // Since device list is unsigned, and current primary device is being logged out
        // we should make sure there's no UserKeys backup, so the user won't try
        // to restore it during next login
        crate::comm_service::backup::delete_backup_user_data(
          &user_id,
          &self.comm_auth_service,
        )
        .await?;
      }
    }

    self
      .db_client
      .delete_otks_table_rows_for_user_device(&user_id, &device_id)
      .await?;

    self
      .db_client
      .delete_access_token_data(&user_id, &device_id)
      .await?;

    let device_list = self.get_current_device_list(&user_id).await?;

    tokio::spawn(async move {
      debug!(
        "Sending device list updates to {:?}",
        device_list.device_ids
      );
      let device_ids: Vec<&str> =
        device_list.device_ids.iter().map(AsRef::as_ref).collect();
      let result = tunnelbroker::send_device_list_update(&device_ids).await;
      consume_error(result);
    });

    let blob_client = self.authenticated_blob_client().await?;
    spawn_delete_devices_services_data_task(&blob_client, [device_id].into());

    // for new flow users we should inform it that should use new flow
    if is_new_flow_user {
      return Err(tonic::Status::failed_precondition(
        tonic_status_messages::USE_NEW_FLOW,
      ));
    }

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn log_out_primary_device(
    &self,
    request: tonic::Request<PrimaryDeviceLogoutRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;
    let message = request.into_inner();

    if self
      .db_client
      .get_user_login_flow(&user_id)
      .await?
      .is_v1_flow()
    {
      warn!(
        user_id = redact_sensitive_data(&user_id),
        device_id = redact_sensitive_data(&device_id),
        "Legacy flow device called LogOutPrimaryDevice RPC"
      );
      return Err(tonic::Status::failed_precondition(
        tonic_status_messages::USE_V1_FLOW,
      ));
    }

    info!(
      "Primary device logout request for user_id={}, device_id={}",
      redact_sensitive_data(&user_id),
      redact_sensitive_data(&device_id)
    );
    self
      .verify_device_on_device_list(
        &user_id,
        &device_id,
        DeviceListItemKind::Primary,
      )
      .await?;

    // Get and verify singleton device list
    let parsed_device_list: SignedDeviceList =
      message.signed_device_list.parse()?;

    let maybe_keyserver_device_id = self
      .db_client
      .get_keyserver_device_id_for_user(&user_id)
      .await?;

    let update_payload = DeviceListUpdate::try_from(parsed_device_list)?;
    crate::device_list::verify_singleton_device_list(
      &update_payload,
      &device_id,
      None,
      maybe_keyserver_device_id.as_ref(),
    )?;

    self
      .db_client
      .apply_devicelist_update(
        &user_id,
        update_payload,
        // - We've already validated the list so no need to do it here.
        // - Need to pass the type because it cannot be inferred from None
        None::<DeviceListValidator>,
        // We don't want side effects - we'll take care of removing devices
        // on our own. (Side effect would skip the primary device).
        false,
      )
      .await?;

    let excluded_device_ids =
      maybe_keyserver_device_id.iter().collect::<Vec<_>>();

    debug!(user_id, "Attempting to delete user's access tokens");
    self
      .db_client
      .delete_tokens_for_user_excluding(&user_id, &excluded_device_ids)
      .await?;
    debug!(user_id, "Attempting to delete user's devices");
    let removed_device_ids = self
      .db_client
      .delete_user_devices_data_excluding(&user_id, &excluded_device_ids)
      .await?;
    debug!(user_id, "Attempting to delete user's one-time keys");
    self
      .db_client
      .delete_otks_table_rows_for_user_devices(&user_id, &removed_device_ids)
      .await?;

    let blob_client = self.authenticated_blob_client().await?;
    spawn_delete_devices_services_data_task(&blob_client, removed_device_ids);

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn log_out_secondary_device(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;

    if self
      .db_client
      .get_user_login_flow(&user_id)
      .await?
      .is_v1_flow()
    {
      warn!(
        user_id = redact_sensitive_data(&user_id),
        device_id = redact_sensitive_data(&device_id),
        "Legacy flow device called LogOutSecondaryDevice RPC"
      );
      return Err(tonic::Status::failed_precondition(
        tonic_status_messages::USE_V1_FLOW,
      ));
    }

    info!(
      "Secondary device logout request for user_id={}, device_id={}",
      redact_sensitive_data(&user_id),
      redact_sensitive_data(&device_id)
    );
    self
      .verify_device_on_device_list(
        &user_id,
        &device_id,
        DeviceListItemKind::Secondary,
      )
      .await?;

    self
      .db_client
      .delete_access_token_data(&user_id, &device_id)
      .await?;

    self
      .db_client
      .delete_otks_table_rows_for_user_device(&user_id, &device_id)
      .await?;

    let blob_client = self.authenticated_blob_client().await?;
    spawn_delete_devices_services_data_task(&blob_client, [device_id].into());

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn delete_wallet_user(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;

    debug!("Attempting to delete wallet user: {}", user_id);

    let user_is_password_authenticated = self
      .db_client
      .user_is_password_authenticated(&user_id)
      .await?;

    if user_is_password_authenticated {
      return Err(tonic::Status::permission_denied(
        tonic_status_messages::PASSWORD_USER,
      ));
    }

    self.delete_services_data_for_user(&user_id).await?;

    self.db_client.delete_user(user_id.clone()).await?;

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
      .await?;

    let Some((username, password_file_bytes)) =
      maybe_username_and_password_file
    else {
      return Err(tonic::Status::not_found(
        tonic_status_messages::USER_NOT_FOUND,
      ));
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

    let delete_state = DeletePasswordUserInfo::new(server_login);

    let session_id = self
      .db_client
      .insert_workflow(WorkflowInProgress::PasswordUserDeletion(Box::new(
        delete_state,
      )))
      .await?;

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
    let Some(WorkflowInProgress::PasswordUserDeletion(state)) =
      self.db_client.get_workflow(message.session_id).await?
    else {
      return Err(tonic::Status::not_found(
        tonic_status_messages::SESSION_NOT_FOUND,
      ));
    };

    let mut server_login = state.opaque_server_login;
    server_login
      .finish(&message.opaque_login_upload)
      .map_err(protocol_error_to_grpc_status)?;

    self.delete_services_data_for_user(&user_id).await?;

    self.db_client.delete_user(user_id.clone()).await?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn privileged_delete_users(
    &self,
    request: tonic::Request<PrivilegedDeleteUsersRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;
    if !staff::STAFF_USER_IDS.contains(&user_id.as_str()) {
      return Err(Status::permission_denied(
        tonic_status_messages::USER_IS_NOT_STAFF,
      ));
    }

    for user_id_to_delete in request.into_inner().user_ids {
      self
        .delete_services_data_for_user(&user_id_to_delete)
        .await?;
      self.db_client.delete_user(user_id_to_delete).await?;
    }

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn privileged_reset_user_password_start(
    &self,
    request: tonic::Request<PrivilegedResetUserPasswordStartRequest>,
  ) -> Result<
    tonic::Response<PrivilegedResetUserPasswordStartResponse>,
    tonic::Status,
  > {
    let (staff_user_id, _) = get_user_and_device_id(&request)?;
    if !staff::STAFF_USER_IDS.contains(&staff_user_id.as_str()) {
      return Err(Status::permission_denied(
        tonic_status_messages::USER_IS_NOT_STAFF,
      ));
    }

    let message = request.into_inner();
    debug!(
      "Attempting to start resetting password for user: {:?}",
      &message.username
    );

    let user_id = if !message.skip_password_reset {
      // this returns USER_NOT_FOUND when user is not a password user
      self
        .db_client
        .get_user_info_and_password_file_from_username(&message.username)
        .await?
        .ok_or(tonic::Status::not_found(
          tonic_status_messages::USER_NOT_FOUND,
        ))?
        .user_id
    } else {
      let username = message.username.clone();
      let auth_type = AuthType::from_user_identifier(&username);
      self
        .db_client
        .get_user_id_from_user_info(username, &auth_type)
        .await?
        .ok_or(tonic::Status::not_found(
          tonic_status_messages::USER_NOT_FOUND,
        ))?
    };

    let server_registration = comm_opaque2::server::Registration::new();
    let registration_response = server_registration
      .start(
        &CONFIG.server_setup,
        &message.opaque_registration_request,
        message.username.to_lowercase().as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    let reset_state =
      PrivilegedPasswordResetInfo::new(user_id, message.skip_password_reset);
    let session_id = self
      .db_client
      .insert_workflow(WorkflowInProgress::PrivilegedPasswordReset(Box::new(
        reset_state,
      )))
      .await?;

    let response = PrivilegedResetUserPasswordStartResponse {
      session_id,
      opaque_registration_response: registration_response,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn privileged_reset_user_password_finish(
    &self,
    request: tonic::Request<PrivilegedResetUserPasswordFinishRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let (staff_user_id, _) = get_user_and_device_id(&request)?;
    if !staff::STAFF_USER_IDS.contains(&staff_user_id.as_str()) {
      return Err(Status::permission_denied(
        tonic_status_messages::USER_IS_NOT_STAFF,
      ));
    }

    let message = request.into_inner();

    let Some(WorkflowInProgress::PrivilegedPasswordReset(state)) =
      self.db_client.get_workflow(message.session_id).await?
    else {
      return Err(tonic::Status::not_found(
        tonic_status_messages::SESSION_NOT_FOUND,
      ));
    };

    let server_registration = comm_opaque2::server::Registration::new();
    let password_file = server_registration
      .finish(&message.opaque_registration_upload)
      .map_err(protocol_error_to_grpc_status)?;

    if !state.skip_password_reset {
      self
        .db_client
        .update_user_password(state.user_id.clone(), password_file)
        .await?;
    }

    // Delete backups, blob holders and tunnelbroker device tokens.
    // This has to be done before resetting device list.
    self.delete_services_data_for_user(&state.user_id).await?;
    self.db_client.reset_device_list(&state.user_id).await?;

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
        DateTime::from_timestamp_millis(timestamp).ok_or_else(|| {
          tonic::Status::invalid_argument(
            tonic_status_messages::INVALID_TIMESTAMP,
          )
        })
      })
      .transpose()?;

    let mut db_result = self
      .db_client
      .get_device_list_history(user_id, since)
      .await?;

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
    let request_count = user_ids.len();
    let user_ids: HashSet<String> = user_ids.into_iter().collect();
    debug!(
      "Requesting device lists and platform details for {} users ({} unique)",
      request_count,
      user_ids.len()
    );

    // 1. Fetch device lists
    let device_lists =
      self.db_client.get_current_device_lists(user_ids).await?;
    trace!("Found device lists for {} users", device_lists.keys().len());

    // 2. Fetch platform details
    let flattened_user_device_ids: Vec<(String, String)> = device_lists
      .iter()
      .flat_map(|(user_id, device_list)| {
        device_list
          .device_ids
          .iter()
          .map(|device_id| (user_id.clone(), device_id.clone()))
          .collect::<Vec<_>>()
      })
      .collect();

    let platform_details = self
      .db_client
      .get_devices_platform_details(flattened_user_device_ids)
      .await?;
    trace!(
      "Found platform details for {} users",
      platform_details.keys().len()
    );

    // 3. Prepare output format
    let users_device_lists: HashMap<String, String> = device_lists
      .into_iter()
      .map(|(user_id, device_list_row)| {
        let signed_list = SignedDeviceList::try_from(device_list_row)?;
        let serialized_list = signed_list.as_json_string()?;
        Ok((user_id, serialized_list))
      })
      .collect::<Result<_, tonic::Status>>()?;

    let users_devices_platform_details = platform_details
      .into_iter()
      .map(|(user_id, devices_map)| {
        (user_id, UserDevicesPlatformDetails::from(devices_map))
      })
      .collect();

    let response = PeersDeviceListsResponse {
      users_device_lists,
      users_devices_platform_details,
    };
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn update_device_list(
    &self,
    request: tonic::Request<UpdateDeviceListRequest>,
  ) -> Result<Response<Empty>, tonic::Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;
    info!(
      "Device list update request for user {}.",
      redact_sensitive_data(&user_id),
    );

    let is_new_flow_user = self
      .db_client
      .get_user_login_flow(&user_id)
      .await?
      .is_signed_device_list_flow();

    let new_list = SignedDeviceList::try_from(request.into_inner())?;
    let update = DeviceListUpdate::try_from(new_list)?;

    let validator = if is_new_flow_user {
      // Regular device list update. Issuer must be the primary device.
      self
        .verify_device_on_device_list(
          &user_id,
          &device_id,
          DeviceListItemKind::Primary,
        )
        .await?;
      Some(crate::device_list::validation::update_device_list_rpc_validator)
    } else {
      info!(
        user_id = redact_sensitive_data(&user_id),
        "Attempting to migrate user to signed device list.",
      );

      // new flow migration
      let current_device_list = self.get_current_device_list(&user_id).await?;

      let calling_device_id = &device_id;
      let previous_device_ids: Vec<&str> = current_device_list
        .device_ids
        .iter()
        .map(AsRef::as_ref)
        .collect();
      let new_device_ids: Vec<&str> =
        update.devices.iter().map(AsRef::as_ref).collect();

      let is_valid =
        crate::device_list::validation::new_flow_migration_validator(
          &previous_device_ids,
          &new_device_ids,
          calling_device_id,
        );
      if !is_valid {
        return Err(
          crate::error::Error::DeviceList(
            crate::error::DeviceListError::InvalidDeviceListUpdate,
          )
          .into(),
        );
      }
      // we've already validated it, no further validator required
      None
    };
    self
      .db_client
      .apply_devicelist_update(&user_id, update, validator, true)
      .await?;

    Ok(Response::new(Empty {}))
  }

  #[tracing::instrument(skip_all)]
  async fn link_farcaster_account(
    &self,
    request: tonic::Request<LinkFarcasterAccountRequest>,
  ) -> Result<Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;
    let message = request.into_inner();

    info!(
      user_id = redact_sensitive_data(&user_id),
      fid = redact_sensitive_data(&message.farcaster_id),
      "Attempting to link Farcaster account."
    );

    let mut get_farcaster_users_response = self
      .db_client
      .get_farcaster_users(vec![message.farcaster_id.clone()])
      .await?;

    if get_farcaster_users_response.len() > 1 {
      error!(
        errorType = error_types::GRPC_SERVICES_LOG,
        "multiple users associated with the same Farcaster ID"
      );
      return Err(Status::failed_precondition(
        tonic_status_messages::CANNOT_LINK_FID,
      ));
    }

    if let Some(u) = get_farcaster_users_response.pop() {
      if u.0.user_id == user_id {
        return Ok(Response::new(Empty {}));
      } else {
        warn!("FID already assigned to another user!");
        return Err(Status::already_exists(tonic_status_messages::FID_TAKEN));
      }
    }

    self
      .db_client
      .add_farcaster_id(user_id, message.farcaster_id)
      .await?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn unlink_farcaster_account(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<Response<Empty>, tonic::Status> {
    let (user_id, _) = get_user_and_device_id(&request)?;

    info!(
      user_id = redact_sensitive_data(&user_id),
      "Attempting to unlink Farcaster account."
    );

    self.db_client.remove_farcaster_id(user_id).await?;

    let response = Empty {};
    Ok(Response::new(response))
  }

  #[tracing::instrument(skip_all)]
  async fn find_user_identities(
    &self,
    request: tonic::Request<UserIdentitiesRequest>,
  ) -> Result<Response<UserIdentitiesResponse>, tonic::Status> {
    let message = request.into_inner();
    let user_ids: HashSet<String> = message.user_ids.into_iter().collect();

    let users_table_results = self
      .db_client
      .find_db_user_identities(user_ids.clone())
      .await?;

    // Look up only user IDs that haven't been found in users table
    let reserved_user_ids_to_query: Vec<String> = user_ids
      .into_iter()
      .filter(|user_id| !users_table_results.contains_key(user_id))
      .collect();
    let reserved_user_identifiers = self
      .db_client
      .query_reserved_usernames_by_user_ids(reserved_user_ids_to_query)
      .await?;

    let identities = users_table_results
      .into_iter()
      .map(|(user_id, identifier)| (user_id, identifier.into()))
      .collect();

    let response = UserIdentitiesResponse {
      identities,
      reserved_user_identifiers,
    };
    return Ok(Response::new(response));
  }

  #[tracing::instrument(skip_all)]
  async fn sync_platform_details(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<Response<Empty>, tonic::Status> {
    let (user_id, device_id) = get_user_and_device_id(&request)?;
    let platform_metadata = get_platform_metadata(&request)?;
    let platform_details = PlatformDetails::new(platform_metadata, None)
      .map_err(|_| {
        Status::invalid_argument(
          tonic_status_messages::INVALID_PLATFORM_METADATA,
        )
      })?;

    self
      .db_client
      .update_device_platform_details(user_id, device_id, platform_details)
      .await?;

    Ok(Response::new(Empty {}))
  }
}

#[allow(dead_code)]
enum DeviceListItemKind {
  Any,
  Primary,
  Secondary,
}

impl AuthenticatedService {
  async fn verify_device_on_device_list(
    &self,
    user_id: &String,
    device_id: &String,
    device_kind: DeviceListItemKind,
  ) -> Result<(), tonic::Status> {
    let device_list = self.get_current_device_list(user_id).await?;

    use DeviceListItemKind as DeviceKind;
    let device_on_list = match device_kind {
      DeviceKind::Any => device_list.has_device(device_id),
      DeviceKind::Primary => device_list.is_primary_device(device_id),
      DeviceKind::Secondary => device_list.has_secondary_device(device_id),
    };

    if !device_on_list {
      debug!(
        "Device {} not in device list for user {}",
        device_id, user_id
      );
      return Err(Status::permission_denied(
        tonic_status_messages::DEVICE_NOT_IN_DEVICE_LIST,
      ));
    }

    Ok(())
  }

  async fn delete_services_data_for_user(
    &self,
    user_id: &str,
  ) -> Result<(), Status> {
    debug!("Attempting to delete Backup data for user: {}", &user_id);
    let (device_list_result, delete_backup_result) = tokio::join!(
      self.db_client.get_current_device_list(user_id),
      backup::delete_backup_user_data(user_id, &self.comm_auth_service)
    );

    let device_ids = device_list_result?
      .map(|list| list.device_ids)
      .unwrap_or_default();

    delete_backup_result?;

    debug!(
      "Attempting to delete Blob holders and Tunnelbroker data for devices: {:?}",
      device_ids
    );

    let (tunnelbroker_result, blob_client_result) = tokio::join!(
      tunnelbroker::delete_devices_data(&device_ids),
      self.authenticated_blob_client()
    );
    tunnelbroker_result?;

    let blob_client = blob_client_result?;
    blob::remove_holders_for_devices(&blob_client, &device_ids).await?;

    Ok(())
  }

  /// Retrieves [`BlobServiceClient`] authenticated with a service-to-service token
  async fn authenticated_blob_client(
    &self,
  ) -> Result<BlobServiceClient, crate::error::Error> {
    let s2s_token =
      self
        .comm_auth_service
        .get_services_token()
        .await
        .map_err(|err| {
          tracing::error!(
            errorType = error_types::HTTP_LOG,
            "Failed to retrieve service-to-service token: {err:?}",
          );
          tonic::Status::aborted(tonic_status_messages::UNEXPECTED_ERROR)
        })?;
    let blob_client = self.blob_client.with_authentication(s2s_token.into());
    Ok(blob_client)
  }

  async fn get_current_device_list(
    &self,
    user_id: &str,
  ) -> Result<DeviceListRow, tonic::Status> {
    let device_list = self
      .db_client
      .get_current_device_list(user_id)
      .await
      .map_err(|err| {
        error!(
          user_id = redact_sensitive_data(user_id),
          errorType = error_types::GRPC_SERVICES_LOG,
          "Failed fetching device list: {err}"
        );
        handle_db_error(err)
      })?;

    match device_list {
      Some(device_list) => Ok(device_list),
      None => {
        error!(
          user_id = redact_sensitive_data(user_id),
          errorType = error_types::GRPC_SERVICES_LOG,
          "User has no device list!"
        );
        Err(Status::failed_precondition(
          tonic_status_messages::NO_DEVICE_LIST,
        ))
      }
    }
  }
}

#[derive(
  Clone, serde::Serialize, serde::Deserialize, derive_more::Constructor,
)]
pub struct DeletePasswordUserInfo {
  pub opaque_server_login: comm_opaque2::server::Login,
}

#[derive(
  Clone, serde::Serialize, serde::Deserialize, derive_more::Constructor,
)]
pub struct UpdatePasswordInfo {
  pub opaque_server_login: comm_opaque2::server::Login,
}

#[derive(
  Clone, serde::Serialize, serde::Deserialize, derive_more::Constructor,
)]
pub struct PrivilegedPasswordResetInfo {
  pub user_id: String,
  pub skip_password_reset: bool,
}
