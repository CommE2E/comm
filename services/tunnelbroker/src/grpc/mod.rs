mod proto {
  tonic::include_proto!("tunnelbroker");
}

use proto::tunnelbroker_service_server::{
  TunnelbrokerService, TunnelbrokerServiceServer,
};
use proto::Empty;
use tonic::transport::Server;
use tracing::{debug, error};

use crate::database::{handle_ddb_error, DatabaseClient};
use crate::{constants, ACTIVE_CONNECTIONS, CONFIG};

struct TunnelbrokerGRPC {
  client: DatabaseClient,
}

#[tonic::async_trait]
impl TunnelbrokerService for TunnelbrokerGRPC {
  async fn send_message_to_device(
    &self,
    request: tonic::Request<proto::MessageToDevice>,
  ) -> Result<tonic::Response<proto::Empty>, tonic::Status> {
    let message = request.into_inner();

    debug!("Received message for {}", &message.device_id);
    if let Some(tx) = ACTIVE_CONNECTIONS.get(&message.device_id) {
      if let Err(_) = tx.send(message.payload) {
        error!("Unable to send message to device: {}", &message.device_id);
        ACTIVE_CONNECTIONS.remove(&message.device_id);
      }
    } else {
      self
        .client
        .persist_message(&message.device_id, &message.payload)
        .await
        .map_err(handle_ddb_error)?;
    }

    let response = tonic::Response::new(Empty {});
    Ok(response)
  }
}

pub async fn run_server(
  client: DatabaseClient,
) -> Result<(), tonic::transport::Error> {
  let addr = format!("[::1]:{}", CONFIG.grpc_port)
    .parse()
    .expect("Unable to parse gRPC address");

  tracing::info!("Websocket server listening on {}", &addr);
  Server::builder()
    .http2_keepalive_interval(Some(constants::GRPC_KEEP_ALIVE_PING_INTERVAL))
    .http2_keepalive_timeout(Some(constants::GRPC_KEEP_ALIVE_PING_TIMEOUT))
    .add_service(TunnelbrokerServiceServer::new(TunnelbrokerGRPC { client }))
    .serve(addr)
    .await
}
