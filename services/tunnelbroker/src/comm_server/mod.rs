mod proto {
  tonic::include_proto!("tunnelbroker");
}

use proto::tunnelbroker_service_server::{
  TunnelbrokerService, TunnelbrokerServiceServer,
};
use tonic::transport::Server;

use crate::constants;

#[derive(Debug, Default)]
struct TunnelbrokerGRPC {}

#[tonic::async_trait]
impl TunnelbrokerService for TunnelbrokerGRPC {
  async fn send_message_to_device(
    &self,
    _request: tonic::Request<proto::MessageToDevice>,
  ) -> Result<tonic::Response<proto::Empty>, tonic::Status> {
    unimplemented!()
  }
}

pub async fn run_grpc_server() -> Result<(), tonic::transport::Error> {
  let addr = format!("[::1]:{}", constants::GRPC_SERVER_PORT)
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
