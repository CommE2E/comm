use std::env;
use tonic::transport::Channel;
use tonic::transport::Error;
pub mod proto {
  tonic::include_proto!("tunnelbroker");
}
pub use proto::tunnelbroker_service_client::TunnelbrokerServiceClient;

pub async fn tonic_client_builder(
) -> Result<TunnelbrokerServiceClient<Channel>, Error> {
  let port = env::var("COMM_SERVICES_PORT_TUNNELBROKER")
    .unwrap_or(String::from("50051"));
  let host = env::var("COMM_SERVICES_HOST_TUNNELBROKER")
    .unwrap_or(String::from("localhost"));
  TunnelbrokerServiceClient::connect(format!("http://{}:{}", host, port)).await
}
