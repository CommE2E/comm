use crate::tools::Error;
use crate::tunnelbroker::tunnelbroker_utils::{
  proto::SessionSignatureRequest, TunnelbrokerServiceClient,
};
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
