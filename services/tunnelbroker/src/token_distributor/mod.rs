mod config;
mod error;
mod notif_utils;
mod token_connection;

use crate::constants::error_types;
use crate::database::DatabaseClient;
use crate::farcaster::FarcasterClient;
pub(crate) use crate::token_distributor::config::TokenDistributorConfig;
use crate::token_distributor::token_connection::TokenConnection;
use crate::{amqp_client::amqp::AmqpConnection, log::redact_sensitive_data};
use comm_lib::auth::AuthService;
use comm_lib::database::Error;
use futures_util::future;
use grpc_clients::identity::authenticated::ChainedInterceptedServicesAuthClient;
use std::collections::HashMap;
use tokio::time::interval;
use tokio_util::sync::CancellationToken;
use tracing::{debug, error, info, warn};

pub struct TokenDistributor {
  db: DatabaseClient,
  config: TokenDistributorConfig,
  connections: HashMap<String, CancellationToken>,
  amqp_connection: AmqpConnection,
  grpc_client: ChainedInterceptedServicesAuthClient,
  auth_service: AuthService,
  farcaster_client: FarcasterClient,
}

impl TokenDistributor {
  pub fn new(
    db: DatabaseClient,
    config: TokenDistributorConfig,
    amqp_connection: &AmqpConnection,
    grpc_client: ChainedInterceptedServicesAuthClient,
    auth_service: &AuthService,
    farcaster_client: FarcasterClient,
  ) -> Self {
    info!(
      "Initializing TokenDistributor - max_connections: {}, \
      scan_interval: {}s, heartbeat_interval: {}s, heartbeat_timeout: {}s,\
      ping_timeout: {}s, metrics_interval: {}s",
      config.max_connections,
      config.scan_interval.as_secs(),
      config.heartbeat_interval.as_secs(),
      config.heartbeat_timeout.as_secs(),
      config.ping_timeout.as_secs(),
      config.metrics_interval.as_secs()
    );

    // Emit initial metrics
    info!(
      metricType = "TokenDistributor_InstanceStarted",
      metricValue = 1,
      instanceId = config.instance_id,
      maxConnections = config.max_connections,
      "TokenDistributor instance started"
    );

    Self {
      db,
      config,
      connections: HashMap::new(),
      amqp_connection: amqp_connection.clone(),
      grpc_client,
      auth_service: auth_service.clone(),
      farcaster_client,
    }
  }

  pub async fn start(&mut self) -> Result<(), Error> {
    info!(
      "Starting TokenDistributor with instance_id: {}",
      self.config.instance_id
    );

    let mut scan_interval = interval(self.config.scan_interval);
    let mut metrics_interval = interval(self.config.metrics_interval);

    loop {
      tokio::select! {
        _ = scan_interval.tick() => {
          if let Err(e) = self.scan_and_claim_tokens().await {
            error!(
              errorType = error_types::DDB_ERROR,
              "Failed to scan and claim tokens: {:?}", e
            );
          }
        }
        _ = metrics_interval.tick() => {
          self.emit_metrics().await;
        }
        _ = tokio::signal::ctrl_c() => {
          info!("Received killing signal, starting graceful shutdown");
          break;
        }
      }
    }

    self.graceful_shutdown().await?;

    Ok(())
  }

  async fn scan_and_claim_tokens(&mut self) -> Result<(), Error> {
    // Clean up dead connections first
    self.cleanup_dead_connections();

    let timeout_threshold = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .expect("Time went backwards")
      .as_secs()
      - self.config.heartbeat_timeout.as_secs();

    // Calculate how many tokens we can still handle
    let available_slots = self
      .config
      .max_connections
      .saturating_sub(self.connections.len());

    if available_slots == 0 {
      debug!(
        "Already at maximum connections ({}), skipping token scan",
        self.config.max_connections
      );
      return Ok(());
    }

    debug!(
      "Scanning for orphaned tokens with timeout_threshold: {} ({}s ago), \
      available_slots: {}",
      timeout_threshold,
      self.config.heartbeat_timeout.as_secs(),
      available_slots
    );

    let orphaned_tokens =
      self.db.scan_orphaned_tokens(timeout_threshold).await?;

    if orphaned_tokens.is_empty() {
      debug!("No orphaned tokens found during scan");
    } else {
      info!("Found {} orphaned tokens to process", orphaned_tokens.len());

      // Emit orphaned tokens metric
      info!(
        metricType = "TokenDistributor_OrphanedTokensFound",
        metricValue = orphaned_tokens.len(),
        instanceId = self.config.instance_id,
        "Orphaned tokens discovered during scan"
      );
    }

    let mut claimed_count = 0;
    for token_info in orphaned_tokens {
      let user_id = token_info.user_id.clone();

      if claimed_count >= available_slots {
        info!(
          "Reached maximum connections limit ({}), stopping token claiming",
          self.config.max_connections
        );
        break;
      }

      if self.connections.contains_key(&user_id) {
        debug!("Already managing token for user: {}", user_id);
        continue;
      }

      // Try to claim the token
      match self
        .db
        .claim_token(&user_id, &self.config.instance_id, timeout_threshold)
        .await
      {
        Ok(true) => {
          info!(
            "Successfully claimed token for user: {} (claimed {}/{})",
            redact_sensitive_data(&user_id),
            claimed_count + 1,
            available_slots
          );

          // Emit token claimed metric
          info!(
            metricType = "TokenDistributor_TokenClaimed",
            metricValue = 1,
            instanceId = self.config.instance_id,
            userId = redact_sensitive_data(&user_id),
            "Token successfully claimed"
          );

          // Create cancellation token for this connection
          let cancel_token = CancellationToken::new();

          // Spawn TokenConnection task
          info!(
            "Starting WebSocket connection task for user: {}",
            redact_sensitive_data(&user_id)
          );

          TokenConnection::start(
            self.db.clone(),
            self.config.clone(),
            token_info,
            self.amqp_connection.clone(),
            cancel_token.clone(),
            self.grpc_client.clone(),
            &self.auth_service,
            self.farcaster_client.clone(),
          );

          // Store the cancellation token
          self.connections.insert(user_id, cancel_token);
          claimed_count += 1;
          info!(
            "Active connections: {}/{}",
            self.connections.len(),
            self.config.max_connections
          );
        }
        Ok(false) => {
          debug!(
            "Token for user {} already claimed by another instance",
            user_id
          );
        }
        Err(e) => {
          warn!(
            "Database error while claiming token for user {}: {:?}",
            redact_sensitive_data(&user_id),
            e
          );

          // Emit token claim failure metric
          info!(
            metricType = "TokenDistributor_TokenClaimFailure",
            metricValue = 1,
            instanceId = self.config.instance_id,
            userId = redact_sensitive_data(&user_id),
            "Token claim failed due to database error"
          );
        }
      }
    }

    Ok(())
  }

  fn cleanup_dead_connections(&mut self) {
    let initial_count = self.connections.len();
    self.connections.retain(|user_id, cancel_token| {
      if cancel_token.is_cancelled() {
        debug!("Removing dead connection for user: {}", user_id);
        false
      } else {
        true
      }
    });

    let cleaned_count = initial_count - self.connections.len();
    if cleaned_count > 0 {
      debug!("Cleaned up {} dead connections", cleaned_count);

      // Emit dead connections cleaned metric
      info!(
        metricType = "TokenDistributor_DeadConnectionsCleaned",
        metricValue = cleaned_count,
        instanceId = self.config.instance_id,
        "Dead connections cleaned up"
      );
    }
  }

  async fn emit_metrics(&self) {
    // Emit current active connections metric
    info!(
      metricType = "TokenDistributor_ActiveConnections",
      metricValue = self.connections.len(),
      instanceId = self.config.instance_id,
      "Current active connections count"
    );

    // Emit total tokens count metric
    match self.db.get_total_tokens_count().await {
      Ok(total_tokens) => {
        info!(
          metricType = "TokenDistributor_TotalTokensCount",
          metricValue = total_tokens,
          instanceId = self.config.instance_id,
          "Total tokens count in database"
        );
      }
      Err(e) => {
        error!(
          errorType = error_types::DDB_ERROR,
          "Failed to get total tokens count: {:?}", e
        );
      }
    }
  }
  async fn graceful_shutdown(&mut self) -> Result<(), Error> {
    info!("Starting graceful shutdown...");

    let user_ids: Vec<String> = self.connections.keys().cloned().collect();

    if !user_ids.is_empty() {
      info!("Releasing {} tokens during shutdown", user_ids.len());
    }

    // Cancel all connections gracefully
    for cancel_token in self.connections.values() {
      cancel_token.cancel();
    }

    let release_futures = user_ids.iter().map(|user_id| {
      let db = &self.db;
      let instance_id = &self.config.instance_id;
      let user_id_clone = user_id.clone();
      async move {
        match db.release_token(&user_id_clone, instance_id).await {
          Ok(true) => {
            debug!("Released token for user: {}", user_id_clone);

            // Emit token released metric
            info!(
              metricType = "TokenDistributor_TokenReleased",
              metricValue = 1,
              instanceId = instance_id,
              userId = redact_sensitive_data(&user_id_clone),
              "Token successfully released during shutdown"
            );
          }
          Ok(false) => {
            debug!("Token for user {} already released", user_id_clone);
          }
          Err(e) => {
            warn!(
              "Failed to release token for user {}: {:?}",
              redact_sensitive_data(&user_id_clone),
              e
            );
          }
        }
      }
    });

    future::join_all(release_futures).await;

    // Clear connections
    self.connections.clear();

    info!("Graceful shutdown completed");
    Ok(())
  }
}
