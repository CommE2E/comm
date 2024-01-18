use std::collections::HashMap;

use crate::config::CONFIG;
use crate::database::DeviceListRow;
use crate::grpc_utils::DeviceInfoWithAuth;
use crate::{
  client_service::{
    handle_db_error, CacheExt, PasswordUserVerificationState,
    UpdateContinueState, WorkflowInProgress,
  },
  constants::request_metadata,
  database::DatabaseClient,
  ddb_utils::DateTimeExt,
  grpc_services::shared::get_value,
  token::AuthType,
};
use chrono::{DateTime, Utc};
use comm_opaque2::grpc::protocol_error_to_grpc_status;
use moka::future::Cache;
use tonic::{Request, Response, Status};
use tracing::{debug, error};

use super::protos::auth::{
  find_user_id_request, identity,
  identity_client_service_server::IdentityClientService,
  DeletePasswordUserFinishRequest, DeletePasswordUserStartRequest,
  DeletePasswordUserStartResponse, FindUserIdRequest, FindUserIdResponse,
  GetDeviceListRequest, GetDeviceListResponse, Identity, InboundKeyInfo,
  InboundKeysForUserRequest, InboundKeysForUserResponse, KeyserverKeysResponse,
  OutboundKeyInfo, OutboundKeysForUserRequest, OutboundKeysForUserResponse,
  RefreshUserPrekeysRequest, UpdateUserPasswordContinueRequest,
  UpdateUserPasswordContinueResponse, UpdateUserPasswordFinishRequest,
  UpdateUserPasswordStartRequest, UpdateUserPasswordStartResponse,
  UploadOneTimeKeysRequest,
};
use super::protos::unauth::{Empty, IdentityKeyInfo, Prekey};

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
      .set_prekey(
        user_id,
        device_id,
        content_keys.prekey,
        content_keys.prekey_signature,
        notif_keys.prekey,
        notif_keys.prekey_signature,
      )
      .await
      .map_err(handle_db_error)?;

    let response = Response::new(Empty {});
    Ok(response)
  }

  async fn get_outbound_keys_for_user(
    &self,
    request: tonic::Request<OutboundKeysForUserRequest>,
  ) -> Result<tonic::Response<OutboundKeysForUserResponse>, tonic::Status> {
    let message = request.into_inner();

    let devices_map = self
      .db_client
      .get_keys_for_user_id(&message.user_id, true)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| tonic::Status::not_found("user not found"))?;

    let transformed_devices = devices_map
      .into_iter()
      .filter_map(|(key, device_info)| {
        let device_info_with_auth = DeviceInfoWithAuth {
          device_info,
          auth_type: None,
        };
        match OutboundKeyInfo::try_from(device_info_with_auth) {
          Ok(key_info) => Some((key, key_info)),
          Err(_) => {
            error!("Failed to transform device info for key {}", key);
            None
          }
        }
      })
      .collect::<HashMap<_, _>>();

    Ok(tonic::Response::new(OutboundKeysForUserResponse {
      devices: transformed_devices,
    }))
  }

  async fn get_inbound_keys_for_user(
    &self,
    request: tonic::Request<InboundKeysForUserRequest>,
  ) -> Result<tonic::Response<InboundKeysForUserResponse>, tonic::Status> {
    use identity::IdentityInfo;

    let message = request.into_inner();

    let devices_map = self
      .db_client
      .get_keys_for_user_id(&message.user_id, false)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| tonic::Status::not_found("user not found"))?;

    let transformed_devices = devices_map
      .into_iter()
      .filter_map(|(key, device_info)| {
        let device_info_with_auth = DeviceInfoWithAuth {
          device_info,
          auth_type: None,
        };
        match InboundKeyInfo::try_from(device_info_with_auth) {
          Ok(key_info) => Some((key, key_info)),
          Err(_) => {
            error!("Failed to transform device info for key {}", key);
            None
          }
        }
      })
      .collect::<HashMap<_, _>>();

    let identifier = self
      .db_client
      .get_user_identifier(&message.user_id)
      .await
      .map_err(handle_db_error)?;

    let identity_info = IdentityInfo::try_from(identifier)?;

    Ok(tonic::Response::new(InboundKeysForUserResponse {
      devices: transformed_devices,
      identity: Some(Identity {
        identity_info: Some(identity_info),
      }),
    }))
  }

  async fn get_keyserver_keys(
    &self,
    request: Request<OutboundKeysForUserRequest>,
  ) -> Result<Response<KeyserverKeysResponse>, Status> {
    use identity::IdentityInfo;

    let message = request.into_inner();

    let keyserver_info = self
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
        content_prekey: Some(Prekey {
          prekey: db_keys.content_prekey.prekey,
          prekey_signature: db_keys.content_prekey.prekey_signature,
        }),
        notif_prekey: Some(Prekey {
          prekey: db_keys.notif_prekey.prekey,
          prekey_signature: db_keys.notif_prekey.prekey_signature,
        }),
        one_time_content_prekey: db_keys.content_one_time_key,
        one_time_notif_prekey: db_keys.notif_one_time_key,
      });

    let identifier = self
      .db_client
      .get_user_identifier(&message.user_id)
      .await
      .map_err(handle_db_error)?;

    let identity_info = IdentityInfo::try_from(identifier)?;

    let identity = Some(Identity {
      identity_info: Some(identity_info),
    });

    let response = Response::new(KeyserverKeysResponse {
      keyserver_info,
      identity,
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
        message.content_one_time_prekeys,
        message.notif_one_time_prekeys,
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

    let (is_reserved_result, user_id_result) = tokio::join!(
      self
        .db_client
        .username_in_reserved_usernames_table(&user_ident),
      self
        .db_client
        .get_user_id_from_user_info(user_ident.clone(), &auth_type),
    );
    let is_reserved = is_reserved_result.map_err(handle_db_error)?;
    let user_id = user_id_result.map_err(handle_db_error)?;

    Ok(Response::new(FindUserIdResponse {
      user_id,
      is_reserved,
    }))
  }

  async fn update_user_password_start(
    &self,
    request: tonic::Request<UpdateUserPasswordStartRequest>,
  ) -> Result<tonic::Response<UpdateUserPasswordStartResponse>, tonic::Status>
  {
    let message = request.into_inner();

    let response = self
      .password_verification_start(
        message,
        PasswordVerificationWorkflow::Update,
      )
      .await?;

    match response {
      PasswordVerificationResponse::Update(update_response) => {
        Ok(Response::new(update_response))
      }
      _ => Err(tonic::Status::internal("unexpected_response_type")),
    }
  }

  async fn update_user_password_continue(
    &self,
    request: tonic::Request<UpdateUserPasswordContinueRequest>,
  ) -> Result<tonic::Response<UpdateUserPasswordContinueResponse>, tonic::Status>
  {
    let message = request.into_inner();
    let session_id = message.session_id();

    // Step 1: Finish password verification and get cached state
    let state = self
      .password_verification_finish(
        &message,
        PasswordVerificationWorkflow::Update,
      )
      .await?;

    // Step 2: Start OPAQUE registration
    let server_registration = comm_opaque2::server::Registration::new();
    let server_message = server_registration
      .start(
        &CONFIG.server_setup,
        &message.opaque_registration_request,
        state.username.as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    // Step 3: Store user ID (used in `update_user_password_finish` request)
    // keyed on session ID sent by client
    let update_continue_state = UpdateContinueState {
      user_id: state.user_id,
    };
    self
      .cache
      .insert(
        session_id.to_string(),
        WorkflowInProgress::UpdateContinue(update_continue_state),
      )
      .await;

    // Step 4: Send response to client
    let response = UpdateUserPasswordContinueResponse {
      opaque_registration_response: server_message,
    };
    Ok(Response::new(response))
  }

  async fn update_user_password_finish(
    &self,
    request: tonic::Request<UpdateUserPasswordFinishRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    // Step 1: Get state stored in `update_user_password_continue`
    let Some(WorkflowInProgress::UpdateContinue(state)) =
      self.cache.get(&message.session_id)
    else {
      return Err(tonic::Status::not_found("session_not_found"));
    };

    self.cache.invalidate(&message.session_id).await;

    // Step 2: Finish OPAQUE registration
    let server_registration = comm_opaque2::server::Registration::new();
    let password_file = server_registration
      .finish(&message.opaque_registration_upload)
      .map_err(protocol_error_to_grpc_status)?;

    // Step 3: Update DynamoDB with new password file
    self
      .db_client
      .update_user_password(state.user_id, password_file)
      .await
      .map_err(handle_db_error)?;

    // Step 4: Return `Empty` response
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

  async fn delete_password_user_start(
    &self,
    request: tonic::Request<DeletePasswordUserStartRequest>,
  ) -> Result<tonic::Response<DeletePasswordUserStartResponse>, tonic::Status>
  {
    let message = request.into_inner();

    let response = self
      .password_verification_start(
        message,
        PasswordVerificationWorkflow::Delete,
      )
      .await?;

    match response {
      PasswordVerificationResponse::Delete(delete_response) => {
        Ok(Response::new(delete_response))
      }
      _ => Err(tonic::Status::internal("unexpected_response_type")),
    }
  }

  async fn delete_password_user_finish(
    &self,
    request: tonic::Request<DeletePasswordUserFinishRequest>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    let message = request.into_inner();

    // Step 1: Finish password verification and get cached state
    let state = self
      .password_verification_finish(
        &message,
        PasswordVerificationWorkflow::Delete,
      )
      .await?;

    // Step 2: Delete user from DynamoDB
    self
      .db_client
      .delete_user(state.user_id)
      .await
      .map_err(handle_db_error)?;

    // Step 3: Return `Empty` response
    let response = Empty {};
    Ok(Response::new(response))
  }

  async fn delete_wallet_user(
    &self,
    request: tonic::Request<Empty>,
  ) -> Result<tonic::Response<Empty>, tonic::Status> {
    use crate::ddb_utils::Identifier;

    let (user_id, _) = get_user_and_device_id(&request)?;

    // Ensure that user is not registered with a password
    let identifier = self
      .db_client
      .get_user_identifier(&user_id)
      .await
      .map_err(handle_db_error)?;

    let Identifier::WalletAddress(_) = identifier else {
      return Err(tonic::Status::failed_precondition("invalid_identifier"));
    };

    self
      .db_client
      .delete_user(user_id)
      .await
      .map_err(handle_db_error)?;

    let response = Empty {};
    Ok(Response::new(response))
  }

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
      .map(RawDeviceList::from)
      .map(SignedDeviceList::try_from_raw)
      .collect::<Result<Vec<_>, _>>()?;

    let stringified_updates = device_list_updates
      .iter()
      .map(serde_json::to_string)
      .collect::<Result<Vec<_>, _>>()
      .map_err(|err| {
        error!("Failed to serialize device list updates: {}", err);
        tonic::Status::failed_precondition("unexpected error")
      })?;

    Ok(Response::new(GetDeviceListResponse {
      device_list_updates: stringified_updates,
    }))
  }
}

impl AuthenticatedService {
  async fn password_verification_start(
    &self,
    request: impl PasswordVerificationStart,
    workflow_type: PasswordVerificationWorkflow,
  ) -> Result<PasswordVerificationResponse, tonic::Status> {
    // Step 1: Get OPAQUE password file and user ID
    let user_id_and_password_file = self
      .db_client
      .get_user_id_and_password_file_from_username(&request.username())
      .await
      .map_err(handle_db_error)?;

    let (user_id, password_file_bytes) =
      if let Some(data) = user_id_and_password_file {
        data
      } else {
        return Err(tonic::Status::not_found("user_not_found"));
      };

    // Step 2: Begin server side of OPAQUE login
    let mut server_login = comm_opaque2::server::Login::new();
    let server_response = server_login
      .start(
        &CONFIG.server_setup,
        &password_file_bytes,
        &request.opaque_login_request(),
        &request.username().as_bytes(),
      )
      .map_err(protocol_error_to_grpc_status)?;

    // Step 3: Store login state, user ID, and username
    let start_state = PasswordUserVerificationState {
      user_id,
      opaque_server_login: server_login,
      username: request.username().to_string(),
    };

    let session_id = match workflow_type {
      PasswordVerificationWorkflow::Update => {
        self
          .cache
          .insert_with_uuid_key(WorkflowInProgress::UpdateStart(start_state))
          .await
      }
      PasswordVerificationWorkflow::Delete => {
        self
          .cache
          .insert_with_uuid_key(WorkflowInProgress::Delete(start_state))
          .await
      }
    };

    // Step 4: Send response to client
    let response = match workflow_type {
      PasswordVerificationWorkflow::Update => {
        PasswordVerificationResponse::Update(UpdateUserPasswordStartResponse {
          session_id,
          opaque_login_response: server_response,
        })
      }
      PasswordVerificationWorkflow::Delete => {
        PasswordVerificationResponse::Delete(DeletePasswordUserStartResponse {
          session_id,
          opaque_login_response: server_response,
        })
      }
    };

    Ok(response)
  }

  async fn password_verification_finish(
    &self,
    request: &impl PasswordVerificationFinish,
    workflow_type: PasswordVerificationWorkflow,
  ) -> Result<PasswordUserVerificationState, tonic::Status> {
    // Step 1: Get login state
    let session_id = request.session_id();

    let state_opt = match (workflow_type, self.cache.get(session_id)) {
      (
        PasswordVerificationWorkflow::Delete,
        Some(WorkflowInProgress::Delete(state)),
      ) => {
        self.cache.invalidate(session_id).await;
        Some(state)
      }
      (
        PasswordVerificationWorkflow::Update,
        Some(WorkflowInProgress::UpdateStart(state)),
      ) => {
        self.cache.invalidate(session_id).await;
        Some(state)
      }
      _ => None,
    };

    // Step 2: Finish OPAQUE login and return state
    let Some(state) = state_opt else {
      return Err(tonic::Status::not_found("session_not_found"));
    };

    Ok(state)
  }
}

enum PasswordVerificationWorkflow {
  Update,
  Delete,
}

enum PasswordVerificationResponse {
  Update(UpdateUserPasswordStartResponse),
  Delete(DeletePasswordUserStartResponse),
}

trait PasswordVerificationStart {
  fn username(&self) -> &str;
  fn opaque_login_request(&self) -> &Vec<u8>;
}

impl PasswordVerificationStart for UpdateUserPasswordStartRequest {
  fn username(&self) -> &str {
    &self.username
  }
  fn opaque_login_request(&self) -> &Vec<u8> {
    &self.opaque_login_request
  }
}

impl PasswordVerificationStart for DeletePasswordUserStartRequest {
  fn username(&self) -> &str {
    &self.username
  }
  fn opaque_login_request(&self) -> &Vec<u8> {
    &self.opaque_login_request
  }
}

trait PasswordVerificationFinish {
  fn session_id(&self) -> &str;
  fn opaque_login_upload(&self) -> &Vec<u8>;
}

impl PasswordVerificationFinish for DeletePasswordUserFinishRequest {
  fn session_id(&self) -> &str {
    &self.session_id
  }

  fn opaque_login_upload(&self) -> &Vec<u8> {
    &self.opaque_login_upload
  }
}

impl PasswordVerificationFinish for UpdateUserPasswordContinueRequest {
  fn session_id(&self) -> &str {
    &self.session_id
  }

  fn opaque_login_upload(&self) -> &Vec<u8> {
    &self.opaque_login_upload
  }
}

// raw device list that can be serialized to JSON (and then signed in the future)
#[derive(serde::Serialize)]
struct RawDeviceList {
  devices: Vec<String>,
  timestamp: i64,
}

impl From<DeviceListRow> for RawDeviceList {
  fn from(row: DeviceListRow) -> Self {
    Self {
      devices: row.device_ids,
      timestamp: row.timestamp.timestamp_millis(),
    }
  }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SignedDeviceList {
  /// JSON-stringified [`RawDeviceList`]
  raw_device_list: String,
}

impl SignedDeviceList {
  /// Serialize (and sign in the future) a [`RawDeviceList`]
  fn try_from_raw(raw: RawDeviceList) -> Result<Self, tonic::Status> {
    let stringified_list = serde_json::to_string(&raw).map_err(|err| {
      error!("Failed to serialize raw device list: {}", err);
      tonic::Status::failed_precondition("unexpected error")
    })?;

    Ok(Self {
      raw_device_list: stringified_list,
    })
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn serialize_device_list_updates() {
    let raw_updates = vec![
      RawDeviceList {
        devices: vec!["device1".into()],
        timestamp: 111111111,
      },
      RawDeviceList {
        devices: vec!["device1".into(), "device2".into()],
        timestamp: 222222222,
      },
    ];

    let expected_raw_list1 = r#"{"devices":["device1"],"timestamp":111111111}"#;
    let expected_raw_list2 =
      r#"{"devices":["device1","device2"],"timestamp":222222222}"#;

    let signed_updates = raw_updates
      .into_iter()
      .map(SignedDeviceList::try_from_raw)
      .collect::<Result<Vec<_>, _>>()
      .expect("signing device list updates failed");

    assert_eq!(signed_updates[0].raw_device_list, expected_raw_list1);
    assert_eq!(signed_updates[1].raw_device_list, expected_raw_list2);

    let stringified_updates = signed_updates
      .iter()
      .map(serde_json::to_string)
      .collect::<Result<Vec<_>, _>>()
      .expect("serialize signed device lists failed");

    let expected_stringified_list1 = r#"{"rawDeviceList":"{\"devices\":[\"device1\"],\"timestamp\":111111111}"}"#;
    let expected_stringified_list2 = r#"{"rawDeviceList":"{\"devices\":[\"device1\",\"device2\"],\"timestamp\":222222222}"}"#;

    assert_eq!(stringified_updates[0], expected_stringified_list1);
    assert_eq!(stringified_updates[1], expected_stringified_list2);
  }
}
