use crate::CONFIG;
use lapin::{Connection, ConnectionProperties};
use tracing::info;

pub async fn connect() -> Connection {
  let amqp_uri = format!("amqp://{}:{}", CONFIG.amqp_address, CONFIG.amqp_port);
  let conn = Connection::connect(&amqp_uri, ConnectionProperties::default())
    .await
    .expect("Unable to connect to amqp endpoint");

  info!("Connected to amqp endpoint: {}", &amqp_uri);

  return conn;
}
