mod proto {
  tonic::include_proto!("identity.tunnelbroker");
}

use proto::identity_tunnelbroker_service_server::{
  IdentityTunnelbrokerService, IdentityTunnelbrokerServiceServer,
};
use tonic::transport::Server;

use crate::constants;

#[derive(Debug, Default)]
struct IdentityService {}

#[tonic::async_trait]
impl IdentityTunnelbrokerService for IdentityService {
  async fn refresh_device_keys(
    &self,
    _request: tonic::Request<proto::RefreshDeviceKeysRequest>,
  ) -> Result<tonic::Response<proto::Empty>, tonic::Status> {
    unimplemented!()
  }
}

pub async fn run_identity_server() -> Result<(), tonic::transport::Error> {
  let addr = format!("[::1]:{}", constants::GRPC_SERVER_PORT)
    .parse()
    .expect("Unable to parse identity address");

  tracing::info!("Websocket server listening on {}", &addr);
  Server::builder()
    .http2_keepalive_interval(Some(constants::GRPC_KEEP_ALIVE_PING_INTERVAL))
    .http2_keepalive_timeout(Some(constants::GRPC_KEEP_ALIVE_PING_TIMEOUT))
    .add_service(IdentityTunnelbrokerServiceServer::new(
      IdentityService::default(),
    ))
    .serve(addr)
    .await
}
