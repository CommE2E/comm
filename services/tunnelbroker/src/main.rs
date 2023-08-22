pub mod amqp;
pub mod config;
pub mod constants;
pub mod database;
pub mod error;
pub mod grpc;
pub mod identity;
pub mod websockets;

use anyhow::{anyhow, Result};
use config::CONFIG;
use tracing::{self, Level};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
  tracing::subscriber::set_global_default(subscriber)
    .expect("Unable to configure tracing");

  config::parse_cmdline_args()?;
  let aws_config = config::load_aws_config().await;
  let db_client = database::DatabaseClient::new(&aws_config);
  let amqp_connection = amqp::connect().await;

  let grpc_server = grpc::run_server(db_client.clone(), &amqp_connection);
  let websocket_server =
    websockets::run_server(db_client.clone(), &amqp_connection);

  tokio::select! {
    Ok(_) = grpc_server => { Ok(()) },
    Ok(_) = websocket_server => { Ok(()) },
    else => {
      tracing::error!("A grpc or websocket server crashed.");
      Err(anyhow!("A grpc or websocket server crashed."))
    }
  }
}
