use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tonic::transport::Channel;
use tunnelbroker::tunnelbroker_service_client::TunnelbrokerServiceClient;

mod tunnelbroker {
  tonic::include_proto!("tunnelbroker");
}

lazy_static! {
  pub static ref RUNTIME: Arc<Runtime> = Arc::new(
    Builder::new_multi_thread()
      .worker_threads(1)
      .max_blocking_threads(1)
      .enable_all()
      .build()
      .unwrap()
  );
}

pub fn initialize_client<T>(
  addr: String,
) -> TunnelbrokerServiceClient<Channel> {
  RUNTIME
    .block_on(TunnelbrokerServiceClient::connect(addr))
    .expect("Failed to create Tokio runtime for the Tunnelbroker client")
}
