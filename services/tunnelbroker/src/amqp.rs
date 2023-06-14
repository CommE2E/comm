use crate::CONFIG;
use lapin::{Connection, ConnectionProperties};
use tracing::info;

pub async fn connect() -> Connection {
  let conn =
    Connection::connect(&CONFIG.amqp_uri, ConnectionProperties::default())
      .await
      .expect("Unable to connect to amqp endpoint");

  info!("Connected to amqp endpoint: {}", &CONFIG.amqp_uri);

  return conn;
}
