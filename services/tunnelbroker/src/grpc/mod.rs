mod proto {
  tonic::include_proto!("tunnelbroker");
}

use proto::tunnelbroker_service_server::{
  TunnelbrokerService, TunnelbrokerServiceServer,
};
use proto::Empty;
use tonic::transport::Server;
use tonic::Status;
use tracing::debug;

use crate::{constants, ACTIVE_CONNECTIONS, CONFIG};

#[derive(Debug, Default)]
struct TunnelbrokerGRPC {}

#[tonic::async_trait]
impl TunnelbrokerService for TunnelbrokerGRPC {
  async fn send_message_to_device(
    &self,
    request: tonic::Request<proto::MessageToDevice>,
  ) -> Result<tonic::Response<proto::Empty>, tonic::Status> {
    let message = request.into_inner();

    debug!("Received message for {}", &message.device_id);
    // TODO: Persist messages for inactive connections
    let tx = ACTIVE_CONNECTIONS
      .get(&message.device_id)
      .ok_or(Status::unavailable("Device does not exist"))?;
    tx.send(message.payload).expect("Unable to send message");

    let response = tonic::Response::new(Empty {});
    Ok(response)
  }
}

pub async fn run_server() -> Result<(), tonic::transport::Error> {
  let addr = format!("[::1]:{}", CONFIG.grpc_port)
    .parse()
    .expect("Unable to parse gRPC address");

  tracing::info!("Websocket server listening on {}", &addr);
  Server::builder()
    .http2_keepalive_interval(Some(constants::GRPC_KEEP_ALIVE_PING_INTERVAL))
    .http2_keepalive_timeout(Some(constants::GRPC_KEEP_ALIVE_PING_TIMEOUT))
    .add_service(TunnelbrokerServiceServer::new(TunnelbrokerGRPC::default()))
    .serve(addr)
    .await
}
