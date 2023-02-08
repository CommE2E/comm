use anyhow::Result;
use tracing::{info, Level};
use tracing_subscriber::EnvFilter;

pub mod constants;

fn configure_logging() -> Result<()> {
  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(constants::LOG_LEVEL_ENV_VAR)
    .from_env_lossy();

  let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
  tracing::subscriber::set_global_default(subscriber)?;
  Ok(())
}

fn main() -> Result<()> {
  configure_logging()?;
  info!("Starting the service");
  Ok(())
}
