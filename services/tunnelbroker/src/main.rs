pub mod constants;
pub mod websockets;
use std::io;
use tracing;

#[tokio::main]
async fn main() -> Result<(), io::Error> {
  let subscriber = tracing_subscriber::FmtSubscriber::new();
  tracing::subscriber::set_global_default(subscriber)
    .expect("Unable to configure tracing");

  websockets::create_server().await
}
