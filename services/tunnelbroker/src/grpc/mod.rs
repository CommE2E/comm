mod proto {
  tonic::include_proto!("tunnelbroker");
}

use crate::amqp_client::amqp::{
  send_message_to_device, AmqpChannel, AmqpConnection,
};
use crate::constants::{CLIENT_RMQ_MSG_PRIORITY, WS_SESSION_CLOSE_AMQP_MSG};
use crate::database::DatabaseClient;
use crate::{constants, CONFIG};
use lapin::options::BasicPublishOptions;
use lapin::BasicProperties;
use proto::tunnelbroker_service_server::{
  TunnelbrokerService, TunnelbrokerServiceServer,
};
use proto::Empty;
use tonic::transport::Server;
use tracing::debug;

struct TunnelbrokerGRPC {
  client: DatabaseClient,
  amqp_channel: AmqpChannel,
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

    send_message_to_device(
      &self.client,
      &self.amqp_channel,
      message.device_id,
      message.payload,
    )
    .await
    .map_err(|_| tonic::Status::internal("Internal Error"))?;

    let response = tonic::Response::new(Empty {});
    Ok(response)
  }

  async fn force_close_device_connection(
    &self,
    request: tonic::Request<proto::DeviceConnectionCloseRequest>,
  ) -> Result<tonic::Response<proto::Empty>, tonic::Status> {
    let message = request.into_inner();

    debug!("Connection close request for device {}", &message.device_id);

    self
      .amqp_channel
      .get()
      .await
      .map_err(handle_amqp_error)?
      .basic_publish(
        "",
        &message.device_id,
        BasicPublishOptions::default(),
        WS_SESSION_CLOSE_AMQP_MSG.as_bytes(),
        BasicProperties::default()
          // Connection close request should have higher priority
          .with_priority(CLIENT_RMQ_MSG_PRIORITY + 1)
          // The message should expire quickly. If the device isn't connected
          // (there's no consumer), there's no point in keeping this message.
          .with_expiration("1000".into()),
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

    let response = tonic::Response::new(Empty {});
    Ok(response)
  }
}

pub async fn run_server(
  client: DatabaseClient,
  amqp_connection: &AmqpConnection,
) -> Result<(), tonic::transport::Error> {
  let addr = format!("[::]:{}", CONFIG.grpc_port)
    .parse()
    .expect("Unable to parse gRPC address");

  tracing::info!("gRPC server listening on {}", &addr);
  Server::builder()
    .http2_keepalive_interval(Some(constants::GRPC_KEEP_ALIVE_PING_INTERVAL))
    .http2_keepalive_timeout(Some(constants::GRPC_KEEP_ALIVE_PING_TIMEOUT))
    .add_service(TunnelbrokerServiceServer::new(TunnelbrokerGRPC {
      client,
      amqp_channel: AmqpChannel::new(amqp_connection),
    }))
    .serve(addr)
    .await
}
