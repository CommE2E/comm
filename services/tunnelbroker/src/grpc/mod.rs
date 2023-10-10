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

    self
      .client
      .persist_message(&message.device_id, &message.payload, &client_message_id)
      .await
      .map_err(handle_ddb_error)?;

    self
      .amqp_channel
      .basic_publish(
        "",
        &message.device_id,
        BasicPublishOptions::default(),
        message.payload.as_bytes(),
        BasicProperties::default(),
      )
      .await
      .map_err(handle_amqp_error)?;

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
