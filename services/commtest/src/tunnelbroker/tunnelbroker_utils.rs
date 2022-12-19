use anyhow::bail;
use std::env;
use tonic::transport::Channel;
use tonic::transport::Error;
pub mod proto {
  tonic::include_proto!("tunnelbroker");
}
use super::new_session::get_string_to_sign;
pub use proto::tunnelbroker_service_client::TunnelbrokerServiceClient;

pub async fn tonic_client_builder(
) -> Result<TunnelbrokerServiceClient<Channel>, Error> {
  let port = env::var("COMM_SERVICES_PORT_TUNNELBROKER")
    .unwrap_or(String::from("50051"));
  let host = env::var("COMM_SERVICES_HOST_TUNNELBROKER")
    .unwrap_or(String::from("localhost"));
  TunnelbrokerServiceClient::connect(format!("http://{}:{}", host, port)).await
}

pub async fn session_signature_device_id_format_validation(
  client: &mut TunnelbrokerServiceClient<tonic::transport::Channel>,
) -> anyhow::Result<()> {
  let wrong_device_id =
    "some:OOOQ7b2ueEmQ4QsevRWlXxFCNt055y20T1PHdoYAQRt0S6TLzZWNM6XSvdWqxm";
  if let Ok(_) = get_string_to_sign(client, wrong_device_id).await {
    bail!("Got success result on wrong deviceID format")
  }
  Ok(())
}
