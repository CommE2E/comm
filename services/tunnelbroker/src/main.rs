pub mod constants;
pub mod grpc;
pub mod websockets;
use std::io::{self, Error, ErrorKind};
use tracing;

#[tokio::main]
async fn main() -> Result<(), io::Error> {
  let subscriber = tracing_subscriber::FmtSubscriber::new();
  tracing::subscriber::set_global_default(subscriber)
    .expect("Unable to configure tracing");

  let grpc_server = grpc::run_server();
  let websocket_server = websockets::run_server();

  tokio::select! {
    Ok(_) = grpc_server => { Ok(()) },
    Ok(_) = websocket_server => { Ok(()) },
    else => {
      tracing::error!("A grpc or websocket server crashed.");
      Err(Error::new(ErrorKind::Other, "A grpc or websocket server crashed."))
    }
  }
}
