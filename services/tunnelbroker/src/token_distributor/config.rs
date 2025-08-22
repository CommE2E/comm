use crate::config::CONFIG;
use std::time::Duration;

#[derive(Clone)]
pub struct TokenDistributorConfig {
  pub instance_id: String,
  pub scan_interval: Duration,
  pub heartbeat_interval: Duration,
  pub heartbeat_timeout: Duration,
  pub farcaster_websocket_url: String,
  pub max_connections: usize,
  pub ping_timeout: Duration,
  pub metrics_interval: Duration,
}

impl Default for TokenDistributorConfig {
  fn default() -> Self {
    Self {
      instance_id: uuid::Uuid::new_v4().to_string(),
      scan_interval: Duration::from_secs(
        CONFIG.token_distributor_scan_interval,
      ),
      heartbeat_interval: Duration::from_secs(
        CONFIG.token_distributor_heartbeat_interval,
      ),
      heartbeat_timeout: Duration::from_secs(
        CONFIG.token_distributor_heartbeat_timeout,
      ),
      farcaster_websocket_url: CONFIG.farcaster_websocket_url.clone(),
      max_connections: CONFIG.token_distributor_max_connections,
      ping_timeout: Duration::from_secs(CONFIG.token_distributor_ping_timeout),
      metrics_interval: Duration::from_secs(5 * 60), // 5 minutes
    }
  }
}
