use crate::database::DatabaseClient;
use crate::token_distributor::config::TokenDistributorConfig;
use crate::token_distributor::error::TokenConnectionError;
use futures_util::{SinkExt, StreamExt};
use std::time::Duration;
use tokio::time::{interval, Instant};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tokio_util::sync::CancellationToken;
use tracing::{debug, error, info, trace, warn};

pub(crate) struct TokenConnection {
  db: DatabaseClient,
  config: TokenDistributorConfig,
  user_id: String,
  token_data: String,
}

impl TokenConnection {
  pub(crate) fn start(
    db: DatabaseClient,
    config: TokenDistributorConfig,
    user_id: String,
    token_data: String,
    cancellation_token: CancellationToken,
  ) {
    let connection = Self {
      db: db.clone(),
      config: config.clone(),
      user_id: user_id.clone(),
      token_data,
    };

    tokio::spawn(async move {
      if let Err(e) = connection.run(cancellation_token).await {
        error!("TokenConnection failed for user {}: {:?}", user_id, e);

        // Clean up token in database on connection failure
        if let Err(release_err) =
          db.release_token(&user_id, &config.instance_id).await
        {
          warn!("Failed to release token for user {} after connection failure: {:?}",  user_id, release_err);
        }
      }
    });
  }

  async fn run(
    self,
    cancellation_token: CancellationToken,
  ) -> Result<(), TokenConnectionError> {
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
              warn!(
                "Socket connection failed for user {}, reason: {}",
                self.user_id,
                e
              );

              // Check if we still own the token before retrying
              debug!(
                "Verifying token ownership for user {} before retry",
                self.user_id
              );
              match self.db.update_token_heartbeat(&self.user_id, &self.config.instance_id).await {
                Ok(true) => {
                  debug!(
                    "Token ownership confirmed for user {}, restarting socket in 5 seconds",
                    self.user_id
                  );
                  tokio::time::sleep(Duration::from_secs(5)).await;
                  debug!(
                    "Attempting socket reconnect for user {}",
                    self.user_id
                  );
                }
                Ok(false) => {
                  warn!(
                    "Lost token ownership for user {}, stopping reconnection attempts",
                    self.user_id)
                  ;
                  return Err(TokenConnectionError::TokenOwnershipLost);
                }
                Err(err) => {
                  error!(
                    "Failed to verify token ownership for user {}: {:?}, retrying in 5 seconds",
                    self.user_id,
                    err
                  );
                  tokio::time::sleep(Duration::from_secs(5)).await;
                }
              }
            }
          }
        }
        _ = cancellation_token.cancelled() => {
          info!("Connection cancelled for user: {}", self.user_id);
          return Err(TokenConnectionError::Cancelled);
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
  ) -> Result<(), TokenConnectionError> {
    debug!(
      "Establishing WebSocket connection for user {} to {}",
      self.user_id, self.config.farcaster_websocket_url
    );
    let (ws_stream, _) =
      connect_async(&self.config.farcaster_websocket_url).await?;

    debug!(
      "WebSocket connected successfully for user: {}",
      self.user_id
    );

    let (mut write, mut read) = ws_stream.split();

    // Send auth message
    let auth_msg = serde_json::json!({
      "messageType": "dc_authenticate",
      "data": farcaster_token
    });
    debug!("Sending authentication message for user: {}", self.user_id);
    if let Err(e) = write.send(Message::Text(auth_msg.to_string())).await {
      error!(
        "Failed to send auth message for user {}: {:?}, connection will be retried",
        self.user_id,
        e
      );
      return Err(TokenConnectionError::AuthenticationFailed(format!(
        "Failed to send auth message: {}",
        e
      )));
    }

    info!(
      "WebSocket connected and authenticated successfully for user: {}",
      self.user_id
    );

    let mut heartbeat_interval = interval(self.config.heartbeat_interval);
    let mut last_ping = Instant::now(); // Track last ping time
    let ping_timeout = tokio::time::sleep(self.config.ping_timeout);
    tokio::pin!(ping_timeout);

    trace!(
      "Ping timeout monitoring active for user: {} - timeout: {}s",
      self.user_id,
      self.config.ping_timeout.as_secs()
    );

    loop {
      tokio::select! {
        msg = read.next() => {
          match msg {
            Some(Ok(msg)) => match msg {
              Message::Text(text) => {
                info!("Received message for {}: {}", self.user_id, text);
                //TODO: Handle incoming message
              }
              Message::Binary(_data) => {
                debug!("Received binary message for user: {}", self.user_id);
              }
              Message::Frame(_) => {
                debug!("Received raw frame for user: {}", self.user_id);
              }
              Message::Ping(data) => {
                let elapsed_since_last = last_ping.elapsed();
                trace!("Received ping for user: {} ({}s since last ping), responding with pong",
                       self.user_id, elapsed_since_last.as_secs());
                last_ping = Instant::now(); // Reset ping timeout
                ping_timeout.as_mut().reset(Instant::now() + self.config.ping_timeout);
                let _ = write.send(Message::Pong(data)).await;
              }
              Message::Pong(_data) => {
                trace!("Received pong for user: {}", self.user_id);
              }
              Message::Close(close_frame) => {
                let reason = if let Some(frame) = close_frame {
                  let msg = format!("code: {}, reason: {}", frame.code, frame.reason);
                  error!("WebSocket closed for user {} - {}", self.user_id, msg);
                  msg
                } else {
                  error!("WebSocket closed for user {} without close frame", self.user_id);
                  "no close frame provided".to_string()
                };
                return Err(TokenConnectionError::WebSocketClosed(reason));
              }
            }
            Some(Err(e)) => {
              warn!(
                "WebSocket protocol error for user {}: {:?}, connection will be restarted",
                self.user_id,
                e
              );
              return Err(TokenConnectionError::WebSocketConnection(e));
            }
            None => {
              info!(
                "WebSocket stream ended unexpectedly for user: {}, connection will be restarted",
                self.user_id
              );
              return Err(TokenConnectionError::StreamEnded);
            }
          }
        }

        // Send heartbeat updates
        _ = heartbeat_interval.tick() => {
          match self.db.update_token_heartbeat(&self.user_id, &self.config.instance_id).await {
            Ok(true) => {
              trace!("Heartbeat updated successfully for user: {}", self.user_id);
            }
            Ok(false) => {
              warn!(
                "Lost token ownership for user: {} - another instance may have claimed it",
                self.user_id
              );
              return Err(TokenConnectionError::TokenOwnershipLost);
            }
            Err(e) => {
              error!(
                "Failed to update heartbeat for user {}: {:?}",
                self.user_id,
                e
              );
              return Err(TokenConnectionError::HeartbeatFailed(format!("Database error: {}", e)));
            }
          }
        }

        // Check for ping timeout
        _ = &mut ping_timeout => {
          let elapsed = last_ping.elapsed();
          error!(
            "Ping timeout for user: {} - no ping received for {}s, connection dead",
            self.user_id, elapsed.as_secs()
          );
          return Err(TokenConnectionError::PingTimeout);
        }

        // Handle cancellation
        _ = cancellation_token.cancelled() => {
          info!("Connection cancelled for user: {}, closing WebSocket", self.user_id);

          // Send close frame before terminating
          let _ = write.send(Message::Close(None)).await;

          return Err(TokenConnectionError::Cancelled);
        }
      }
    }
  }
}
