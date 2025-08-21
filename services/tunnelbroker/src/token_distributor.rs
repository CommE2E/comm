use crate::config::CONFIG;
use crate::constants::error_types;
use crate::database::DatabaseClient;
use comm_lib::database::Error;
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use tokio::time::{interval, Duration};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tokio_util::sync::CancellationToken;
use tracing::{debug, error, info, warn};

#[derive(Clone)]
pub struct TokenDistributorConfig {
  pub instance_id: String,
  pub scan_interval: Duration,
  pub heartbeat_interval: Duration,
  pub heartbeat_timeout: Duration,
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
    }
  }
}

pub struct TokenDistributor {
  db: DatabaseClient,
  config: TokenDistributorConfig,
  connections: HashMap<String, CancellationToken>,
}

impl TokenDistributor {
  pub fn new(db: DatabaseClient, config: TokenDistributorConfig) -> Self {
    Self {
      db,
      config,
      connections: HashMap::new(),
    }
  }

  pub async fn start(&mut self) -> Result<(), Error> {
    info!(
      "Starting TokenDistributor with instance_id: {}",
      self.config.instance_id
    );

    let mut scan_interval = interval(self.config.scan_interval);

    loop {
      tokio::select! {
        _ = scan_interval.tick() => {
          if let Err(e) = self.scan_and_claim_tokens().await {
            error!(
              errorType = error_types::TOKEN_DISTRIBUTOR_ERROR,
              "Failed to scan and claim tokens: {:?}", e
            );
          }
        }
        _ = tokio::signal::ctrl_c() => {
          info!("Received Ctrl+C, starting graceful shutdown");
          break;
        }
      }
    }

    // Graceful shutdown
    self.graceful_shutdown().await?;

    Ok(())
  }

  async fn scan_and_claim_tokens(&mut self) -> Result<(), Error> {
    info!("scan_and_claim_tokens");

    let timeout_threshold = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .expect("Time went backwards")
      .as_secs()
      - self.config.heartbeat_timeout.as_secs();

    let orphaned_tokens =
      self.db.scan_orphaned_tokens(timeout_threshold).await?;

    if !orphaned_tokens.is_empty() {
      info!("Found {} orphaned tokens", orphaned_tokens.len());
    }

    for (user_id, token_data) in orphaned_tokens {
      // Check if we're already managing this token
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
          info!("Successfully claimed token for user: {}", user_id);

          // Create cancellation token for this connection
          let cancel_token = CancellationToken::new();

          // Spawn TokenConnection task
          TokenConnection::start(
            self.db.clone(),
            self.config.clone(),
            user_id.clone(),
            token_data,
            cancel_token.clone(),
          );

          // Store the cancellation token
          self.connections.insert(user_id, cancel_token);
        }
        Ok(false) => {
          info!(
            "Failed to claim token for user: {} (already claimed)",
            user_id
          );
        }
        Err(e) => {
          warn!("Error claiming token for user {}: {:?}", user_id, e);
        }
      }
    }

    Ok(())
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

    // Release all tokens in database
    for user_id in user_ids {
      match self
        .db
        .release_token(&user_id, &self.config.instance_id)
        .await
      {
        Ok(true) => {
          debug!("Released token for user: {}", user_id);
        }
        Ok(false) => {
          debug!("Token for user {} already released", user_id);
        }
        Err(e) => {
          warn!("Failed to release token for user {}: {:?}", user_id, e);
        }
      }
    }

    // Clear connections
    self.connections.clear();

    info!("Graceful shutdown completed");
    Ok(())
  }
}

struct TokenConnection {
  db: DatabaseClient,
  config: TokenDistributorConfig,
  user_id: String,
  token_data: String,
}

impl TokenConnection {
  fn start(
    db: DatabaseClient,
    config: TokenDistributorConfig,
    user_id: String,
    token_data: String,
    cancellation_token: CancellationToken,
  ) {
    let connection = Self {
      db,
      config,
      user_id: user_id.clone(),
      token_data,
    };

    tokio::spawn(async move {
      if let Err(e) = connection.run(cancellation_token).await {
        error!(
          errorType = error_types::TOKEN_DISTRIBUTOR_ERROR,
          "TokenConnection failed for user {}: {:?}", user_id, e
        );
      }
    });
  }

  async fn run(
    self,
    cancellation_token: CancellationToken,
  ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!("Starting connection for user: {}", self.user_id);

    loop {
      tokio::select! {
        result = self.connect_and_maintain(&self.token_data, &cancellation_token) => {
          match result {
            Ok(_) => {
              info!("Connection completed normally for user: {}", self.user_id);
              break;
            }
            Err(e) => {
              warn!("Connection failed for user {}: {:?}", self.user_id, e);

              // Check if we still own the token before retrying
              match self.db.update_token_heartbeat(&self.user_id, &self.config.instance_id).await {
                Ok(true) => {
                  info!("Still own token for user {}, retrying connection...", self.user_id);
                  tokio::time::sleep(Duration::from_secs(5)).await;
                }
                Ok(false) => {
                  info!("Lost ownership of token for user {}, stopping connection", self.user_id);
                  break;
                }
                Err(e) => {
                  error!("Failed to update heartbeat for user {}: {:?}", self.user_id, e);
                  tokio::time::sleep(Duration::from_secs(5)).await;
                }
              }
            }
          }
        }
        _ = cancellation_token.cancelled() => {
          info!("Connection cancelled for user: {}", self.user_id);
          break;
        }
      }
    }

    info!("TokenConnection ended for user: {}", self.user_id);
    Ok(())
  }

  async fn connect_and_maintain(
    &self,
    farcaster_token: &str,
    cancellation_token: &CancellationToken,
  ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let (ws_stream, _) = connect_async("wss://ws.farcaster.xyz/stream").await?;

    info!("WebSocket connected for user: {}", self.user_id);

    let (mut write, mut read) = ws_stream.split();
    // Send auth message
    let auth_msg = serde_json::json!({
      "messageType": "dc_authenticate",
      "data": farcaster_token
    });
    if let Err(e) = write.send(Message::Text(auth_msg.to_string())).await {
      error!("Failed to send auth message: {:?}", e);
      tokio::time::sleep(Duration::from_secs(5)).await;
    }

    info!(
      "WebSocket connected and authenticated for user: {}",
      self.user_id
    );

    let mut heartbeat_interval = interval(self.config.heartbeat_interval);

    loop {
      tokio::select! {
        msg = read.next() => {
          match msg {
            Some(Ok(msg)) => match msg {
              Message::Text(_text) => {
                info!("Received message for {}: {}", self.user_id, _text);
                //TODO: Handle incoming message
              }
              Message::Binary(_data) => {
                debug!("Received binary message for user: {}", self.user_id);
              }
              Message::Ping(data) => {
                debug!("Received ping for user: {}, responding with pong", self.user_id);
                let _ = write.send(Message::Pong(data)).await;
              }
              Message::Pong(_data) => {
                debug!("Received pong for user: {}", self.user_id);
              }
              Message::Close(_) => {
                info!("WebSocket closed for user: {}", self.user_id);
                return Err("WebSocket closed".into());
              }
              Message::Frame(_) => {
                debug!("Received raw frame for user: {}", self.user_id);
              }
            }
            Some(Err(e)) => {
              info!("WebSocket error for user {}: {:?}", self.user_id, e);
              return Err(e.into());
            }
            None => {
              info!("WebSocket stream ended for user: {}", self.user_id);
              return Err("Stream ended".into());
            }
          }
        }

        // Send heartbeat updates
        _ = heartbeat_interval.tick() => {
          match self.db.update_token_heartbeat(&self.user_id, &self.config.instance_id).await {
            Ok(true) => {
              info!("Heartbeat updated for user: {}", self.user_id);
            }
            Ok(false) => {
              info!("Lost token ownership for user: {}", self.user_id);
              return Err("Token ownership lost".into());
            }
            Err(e) => {
              error!("Failed to update heartbeat for user {}: {:?}", self.user_id, e);
              return Err(format!("Heartbeat update failed: {:?}", e).into());
            }
          }
        }

        // Handle cancellation
        _ = cancellation_token.cancelled() => {
          info!("Connection cancelled for user: {}, closing WebSocket", self.user_id);

          // Send close frame before terminating
          let _ = write.send(Message::Close(None)).await;

          return Err("Connection cancelled".into());
        }
      }
    }
  }
}
