use super::tunnelbroker_utils::proto::new_session_request::DeviceTypes;
use crate::tools::Error;
use crate::tunnelbroker::tunnelbroker_utils::{
  proto::NewSessionRequest, proto::SessionSignatureRequest,
  TunnelbrokerServiceClient,
};
use openssl::hash::MessageDigest;
use openssl::pkey::PKey;
use openssl::sign::Signer;
use tonic::Request;

pub async fn get_string_to_sign(
  client: &mut TunnelbrokerServiceClient<tonic::transport::Channel>,
  device_id: &str,
) -> Result<String, Error> {
  let response = client
    .session_signature(Request::new(SessionSignatureRequest {
      device_id: String::from(device_id),
    }))
    .await?;
  Ok(response.into_inner().to_sign)
}

pub fn sign_string_with_private_key(
  keypair: &PKey<openssl::pkey::Private>,
  string_to_be_signed: &str,
) -> anyhow::Result<String> {
  let mut signer = Signer::new(MessageDigest::sha256(), &keypair)?;
  signer.update(string_to_be_signed.as_bytes())?;
  let signature = signer.sign_to_vec()?;
  Ok(base64::encode(signature))
}

pub async fn create_new_session(
  client: &mut TunnelbrokerServiceClient<tonic::transport::Channel>,
  device_id: &str,
  public_key: &str,
  signature: &str,
  notify_token: &str,
  device_type: DeviceTypes,
  device_app_version: &str,
  device_os: &str,
) -> Result<String, Error> {
  let response = client
    .new_session(Request::new(NewSessionRequest {
      device_id: device_id.to_string(),
      public_key: public_key.to_string(),
      signature: signature.to_string(),
      notify_token: Some(notify_token.to_string()),
      device_type: device_type as i32,
      device_app_version: device_app_version.to_string(),
      device_os: device_os.to_string(),
    }))
    .await?;
  let session_id = response.into_inner().session_id;
  Ok(session_id)
}
