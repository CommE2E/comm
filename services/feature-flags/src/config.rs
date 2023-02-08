use clap::{builder::FalseyValueParser, Parser};
use once_cell::sync::Lazy;

use crate::constants::DEFAULT_LOCALSTACK_URL;

#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct AppConfig {
  /// Run the service in sandbox
  #[arg(long = "sandbox", default_value_t = false)]
  #[arg(value_parser = FalseyValueParser::new())]
  pub is_sandbox: bool,
  /// AWS Localstack service URL, applicable in sandbox mode
  #[arg(long, default_value_t = DEFAULT_LOCALSTACK_URL.to_string())]
  pub localstack_url: String,
}

pub static CONFIG: Lazy<AppConfig> = Lazy::new(|| AppConfig::parse());

pub fn parse_cmdline_args() {
  Lazy::force(&CONFIG);
}
