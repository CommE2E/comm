use crate::config::CONFIG;
use grpc_clients::tunnelbroker::create_tunnelbroker_client as shared_tb_client;
use grpc_clients::tunnelbroker::protos;
use grpc_clients::tunnelbroker::protos::DeviceConnectionCloseRequest;
use protos::tunnelbroker_service_client::TunnelbrokerServiceClient;
use protos::{DeleteDeviceDataRequest, Empty, MessageToDevice};
use tonic::transport::Channel;
use tonic::Response;
use tonic::Status;
use tracing::error;
use tunnelbroker_messages as messages;

use crate::constants::error_types;
use crate::error::Error;

async fn create_tunnelbroker_client(
) -> Result<TunnelbrokerServiceClient<Channel>, Error> {
  shared_tb_client(&CONFIG.tunnelbroker_endpoint)
    .await
    .map_err(|e| {
      error!(
        errorType = error_types::TUNNELBROKER_LOG,
        "Unable able to connect to tunnelbroker: {:?}", e
      );
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

pub async fn send_device_list_update(device_ids: &[&str]) -> Result<(), Error> {
  let mut tunnelbroker_client = create_tunnelbroker_client().await?;

  let update = messages::IdentityDeviceListUpdated {};
  let payload = serde_json::to_string(&update).unwrap();

  for &device_id in device_ids {
    let request = MessageToDevice {
      device_id: device_id.to_string(),
      payload: payload.clone(),
    };

    let grpc_message = tonic::Request::new(request);

    tunnelbroker_client
      .send_message_to_device(grpc_message)
      .await?;
  }

  Ok(())
}

pub async fn delete_devices_data(device_ids: &[String]) -> Result<(), Error> {
  let mut tunnelbroker_client = create_tunnelbroker_client().await?;

  for device_id in device_ids {
    let request = DeleteDeviceDataRequest {
      device_id: device_id.to_string(),
    };
    let grpc_message = tonic::Request::new(request);
    tunnelbroker_client.delete_device_data(grpc_message).await?;
  }
  Ok(())
}

pub async fn terminate_device_sessions(
  device_ids: &[String],
) -> Result<(), Error> {
  let mut tunnelbroker_client = create_tunnelbroker_client().await?;

  for device_id in device_ids {
    let request = DeviceConnectionCloseRequest {
      device_id: device_id.to_string(),
    };
    let grpc_message = tonic::Request::new(request);
    tunnelbroker_client
      .force_close_device_connection(grpc_message)
      .await?;
  }
  Ok(())
}
