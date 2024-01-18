use std::collections::HashMap;

use crate::config::CONFIG;
use crate::database::DeviceListRow;
use crate::ddb_utils::Identifier;
use crate::{
  client_service::{
    handle_db_error, CacheExt, UpdateState, WorkflowInProgress,
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
  identity_client_service_server::IdentityClientService, FindUserIdRequest,
  FindUserIdResponse, GetDeviceListRequest, GetDeviceListResponse, Identity,
  InboundKeyInfo, InboundKeysForUserRequest, InboundKeysForUserResponse,
  KeyserverKeysResponse, OutboundKeyInfo, OutboundKeysForUserRequest,
  OutboundKeysForUserResponse, RefreshUserPrekeysRequest,
  UpdateUserPasswordFinishRequest, UpdateUserPasswordStartRequest,
  UpdateUserPasswordStartResponse, UploadOneTimeKeysRequest,
};
use super::protos::unauth::Empty;

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

    let identifier = self
      .db_client
      .get_user_identifier(user_id)
      .await
      .map_err(handle_db_error)?;
    let is_wallet_user = matches!(identifier, Identifier::WalletAddress(_));

    let transformed_devices = devices_map
      .into_iter()
      .filter_map(|(device_id, device_info)| {
        if is_wallet_user && !device_info.social_proof_present() {
          error!(
            user_id,
            device_id, "Device has missing social proof for wallet user"
          );
          return None;
        }
        Some((device_id, OutboundKeyInfo::from(device_info)))
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
    let user_id = &message.user_id;

    let devices_map = self
      .db_client
      .get_keys_for_user(user_id, false)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| tonic::Status::not_found("user not found"))?;

    let identifier = self
      .db_client
      .get_user_identifier(user_id)
      .await
      .map_err(handle_db_error)?;
    let is_wallet_user = matches!(identifier, Identifier::WalletAddress(_));

    let transformed_devices = devices_map
      .into_iter()
      .filter_map(|(device_id, device_info)| {
        if is_wallet_user && !device_info.social_proof_present() {
          error!(
            user_id,
            device_id, "Device has missing social proof for wallet user"
          );
          return None;
        }
        Some((device_id, InboundKeyInfo::from(device_info)))
      })
      .collect::<HashMap<_, _>>();

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
      .map(OutboundKeyInfo::from);

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

    let response = UpdateUserPasswordStartResponse {
      session_id,
      opaque_registration_response: server_message,
    };
    Ok(Response::new(response))
  }

  async fn update_user_password_finish(
    &self,
    request: tonic::Request<UpdateUserPasswordFinishRequest>,
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
      .remove_device(user_id.clone(), device_id.clone())
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
