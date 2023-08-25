pub mod config;
pub mod database;
pub mod report_types;

use anyhow::Result;
use tracing_subscriber::filter::{EnvFilter, LevelFilter};

fn configure_logging() -> Result<()> {
  let filter = EnvFilter::builder()
    .with_default_directive(LevelFilter::INFO.into())
    .with_env_var(EnvFilter::DEFAULT_ENV)
    .from_env_lossy();

  let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
  tracing::subscriber::set_global_default(subscriber)?;
  Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
  configure_logging()?;
  config::parse_cmdline_args()?;

  let _aws_config = config::load_aws_config().await;

  println!("Hello, world!");

  Ok(())
}
