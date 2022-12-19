pub mod proto {
  tonic::include_proto!("tunnelbroker");
}
pub use proto::tunnelbroker_service_client::TunnelbrokerServiceClient;
