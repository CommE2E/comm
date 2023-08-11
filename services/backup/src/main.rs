use anyhow::Result;
use tracing::Level;
use tracing_subscriber::EnvFilter;

pub mod config;
pub mod constants;
pub mod database;
pub mod utils;

// re-export this to be available as crate::CONFIG
pub use config::CONFIG;

fn configure_logging() -> Result<()> {
  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
  tracing::subscriber::set_global_default(subscriber)?;
  Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
  config::parse_cmdline_args();
  configure_logging()?;

  let aws_config = config::load_aws_config().await;
  let _db = database::DatabaseClient::new(&aws_config);

  Ok(())
}
