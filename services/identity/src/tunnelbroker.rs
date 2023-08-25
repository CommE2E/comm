use crate::config::CONFIG;
use grpc_clients::tunnelbroker::create_tunnelbroker_client as shared_tb_client;
use grpc_clients::tunnelbroker::protos;
use protos::tunnelbroker_service_client::TunnelbrokerServiceClient;
use protos::{Empty, MessageToDevice};
use tonic::transport::Channel;
use tonic::Response;
use tonic::Status;
use tracing::error;
use tunnelbroker_messages as messages;

use crate::error::Error;

pub async fn create_tunnelbroker_client(
) -> Result<TunnelbrokerServiceClient<Channel>, Error> {
  shared_tb_client(&CONFIG.tunnelbroker_endpoint)
    .await
    .map_err(|e| {
      error!("Unable able to connect to tunnelbroker: {:?}", e);
      Error::Status(Status::invalid_argument(format!("{}", e)))
    })
}

pub async fn send_refresh_keys_request(
  device_id: &str,
) -> Result<Response<Empty>, Error> {
  use crate::constants::ONE_TIME_KEY_REFRESH_NUMBER;

  let mut tunnelbroker_client = create_tunnelbroker_client().await?;

  let refresh_request = messages::RefreshKeyRequest {
    device_id: device_id.to_string(),
    number_of_keys: ONE_TIME_KEY_REFRESH_NUMBER,
  };

  let payload = serde_json::to_string(&refresh_request).unwrap();
  let request = MessageToDevice {
    device_id: device_id.to_string(),
    payload,
  };

  let grpc_message = tonic::Request::new(request);
  Ok(
    tunnelbroker_client
      .send_message_to_device(grpc_message)
      .await?,
  )
}
