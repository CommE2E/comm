mod proto {
  tonic::include_proto!("tunnelbroker");
}

use lapin::{options::BasicPublishOptions, BasicProperties};
use proto::tunnelbroker_service_server::{
  TunnelbrokerService, TunnelbrokerServiceServer,
};
use proto::Empty;
use tonic::transport::Server;
use tracing::debug;
use tunnelbroker_messages::MessageToDevice;

use crate::constants::CLIENT_RMQ_MSG_PRIORITY;
use crate::database::{handle_ddb_error, DatabaseClient};
use crate::{constants, CONFIG};

struct TunnelbrokerGRPC {
  client: DatabaseClient,
  amqp_channel: lapin::Channel,
}

pub fn handle_amqp_error(error: lapin::Error) -> tonic::Status {
  match error {
    lapin::Error::SerialisationError(_) | lapin::Error::ParsingError(_) => {
      tonic::Status::invalid_argument("Invalid argument")
    }
    _ => tonic::Status::internal("Internal Error"),
  }
}

#[tonic::async_trait]
impl TunnelbrokerService for TunnelbrokerGRPC {
  async fn send_message_to_device(
    &self,
    request: tonic::Request<proto::MessageToDevice>,
  ) -> Result<tonic::Response<proto::Empty>, tonic::Status> {
    let message = request.into_inner();

    debug!("Received message for {}", &message.device_id);

    let client_message_id = uuid::Uuid::new_v4().to_string();

    let message_id = self
      .client
      .persist_message(&message.device_id, &message.payload, &client_message_id)
      .await
      .map_err(handle_ddb_error)?;

    let message_to_device = MessageToDevice {
      device_id: message.device_id.clone(),
      payload: message.payload,
      message_id,
    };

    let serialized_message = serde_json::to_string(&message_to_device)
      .map_err(|_| tonic::Status::invalid_argument("Invalid argument"))?;

    self
      .amqp_channel
      .basic_publish(
        "",
        &message.device_id,
        BasicPublishOptions::default(),
        serialized_message.as_bytes(),
        BasicProperties::default().with_priority(CLIENT_RMQ_MSG_PRIORITY),
      )
      .await
      .map_err(handle_amqp_error)?;

    let response = tonic::Response::new(Empty {});
    Ok(response)
  }

  async fn delete_device_data(
    &self,
    request: tonic::Request<proto::DeleteDeviceDataRequest>,
  ) -> Result<tonic::Response<proto::Empty>, tonic::Status> {
    let message = request.into_inner();

    debug!("Deleting {} data", &message.device_id);

    self
      .client
      .remove_device_token(&message.device_id)
      .await
      .map_err(|_| tonic::Status::failed_precondition("unexpected error"))?;

    self
      .client
      .mark_messages_to_device_for_deletion(&message.device_id)
      .await
      .map_err(|_| tonic::Status::failed_precondition("unexpected error"))?;

    let response = tonic::Response::new(Empty {});
    Ok(response)
  }
}

pub async fn run_server(
  client: DatabaseClient,
  ampq_connection: &lapin::Connection,
) -> Result<(), tonic::transport::Error> {
  let addr = format!("[::]:{}", CONFIG.grpc_port)
    .parse()
    .expect("Unable to parse gRPC address");

  let amqp_channel = ampq_connection
    .create_channel()
    .await
    .expect("Unable to create amqp channel");

  tracing::info!("gRPC server listening on {}", &addr);
  Server::builder()
    .http2_keepalive_interval(Some(constants::GRPC_KEEP_ALIVE_PING_INTERVAL))
    .http2_keepalive_timeout(Some(constants::GRPC_KEEP_ALIVE_PING_TIMEOUT))
    .add_service(TunnelbrokerServiceServer::new(TunnelbrokerGRPC {
      client,
      amqp_channel,
    }))
    .serve(addr)
    .await
}
