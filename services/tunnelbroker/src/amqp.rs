use crate::CONFIG;
use lapin::{uri::AMQPUri, Connection, ConnectionProperties};
use tracing::info;

pub async fn connect() -> Connection {
  let mut amqp_uri = CONFIG
    .amqp_uri
    .parse::<AMQPUri>()
    .expect("Invalid AMQP URI");

  // Allow set / override credentials using env vars
  if let Some(amqp_user) = from_env("AMQP_USERNAME") {
    amqp_uri.authority.userinfo.username = amqp_user;
  }
  if let Some(amqp_pass) = from_env("AMQP_PASSWORD") {
    amqp_uri.authority.userinfo.password = amqp_pass;
  }

  let conn = Connection::connect_uri(amqp_uri, ConnectionProperties::default())
    .await
    .expect("Unable to connect to AMQP endpoint");

  info!("Connected to AMQP endpoint: {}", &CONFIG.amqp_uri);
  conn
}

fn from_env(var_name: &str) -> Option<String> {
  std::env::var(var_name).ok().filter(|s| !s.is_empty())
}
