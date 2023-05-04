pub mod config;
pub mod constants;
pub mod database;
pub mod grpc;
pub mod websockets;

use anyhow::{anyhow, Result};
use config::CONFIG;
use dashmap::DashMap;
use once_cell::sync::Lazy;
use tokio::sync::mpsc::UnboundedSender;
use tracing::{self, Level};
use tracing_subscriber::EnvFilter;

pub static ACTIVE_CONNECTIONS: Lazy<DashMap<String, UnboundedSender<String>>> =
  Lazy::new(DashMap::new);

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
  let _db_client = database::DatabaseClient::new(&aws_config);

  let grpc_server = grpc::run_server();
  let websocket_server = websockets::run_server();

  tokio::select! {
    Ok(_) = grpc_server => { Ok(()) },
    Ok(_) = websocket_server => { Ok(()) },
    else => {
      tracing::error!("A grpc or websocket server crashed.");
      Err(anyhow!("A grpc or websocket server crashed."))
    }
  }
}
