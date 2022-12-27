use crate::TunnelbrokerClient;

use crate::tunnelbroker::SessionSignatureRequest;

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
