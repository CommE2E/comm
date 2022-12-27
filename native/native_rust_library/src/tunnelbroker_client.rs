use crate::TunnelbrokerClient;

use crate::tunnelbroker::NewSessionRequest;
use crate::tunnelbroker::{
  new_session_request::DeviceTypes, SessionSignatureRequest,
};

pub async fn get_nonce_to_sign(
  mut client: Box<TunnelbrokerClient>,
  device_id: String,
) -> Result<String, tonic::Status> {
  Ok(
    client
      .tunnelbroker_client
      .session_signature(SessionSignatureRequest { device_id })
      .await?
      .into_inner()
      .to_sign,
  )
}

pub async fn get_new_session_id(
  mut client: Box<TunnelbrokerClient>,
  device_id: String,
  public_key: String,
  signature: String,
  device_type: DeviceTypes,
  device_app_version: String,
  device_os: String,
  notify_token: Option<String>,
) -> Result<String, tonic::Status> {
  Ok(
    client
      .tunnelbroker_client
      .new_session(NewSessionRequest {
        device_id,
        public_key,
        signature,
        notify_token,
        device_type: device_type as i32,
        device_app_version,
        device_os,
      })
      .await?
      .into_inner()
      .session_id,
  )
}
