use std::{env, io::Error};

use tokio::net::{TcpListener, TcpStream};
use tracing::info;

pub async fn create_server() -> Result<(), Error> {
  let addr = env::var("COMM_TUNNELBROKER_WEBSOCKET_ADDR")
    .unwrap_or_else(|_| "127.0.0.1:51001".to_string());

  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
  info!("Listening on: {}", addr);

  while let Ok((stream, _)) = listener.accept().await {
    tokio::spawn(accept_connection(stream));
  }

  Ok(())
}

async fn accept_connection(_stream: TcpStream) {
  unimplemented!()
}
