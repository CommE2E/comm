use crate::amqp_client::amqp::{AmqpChannel, AmqpConnection};
use crate::amqp_client::utils::BasicMessageSender;
use crate::config::CONFIG;
use crate::constants::MEDIA_MIRROR_TIMEOUT;
use crate::database::token_distributor::TokenEntryInfo;
use crate::database::DatabaseClient;
use crate::farcaster::FarcasterClient;
use crate::log::redact_sensitive_data;
use crate::notifs::{GenericNotifClient, NotifRecipientDescriptor};
use crate::token_distributor::config::TokenDistributorConfig;
use crate::token_distributor::error::TokenConnectionError;
use crate::token_distributor::notif_utils::prepare_notif_payload;
use comm_lib::auth::AuthService;
use comm_lib::blob::client::S2SAuthedBlobClient;
use comm_lib::blob::types::http::MirroredMediaInfo;
use futures_util::{SinkExt, StreamExt};
use grpc_clients::identity::authenticated::ChainedInterceptedServicesAuthClient;
use grpc_clients::identity::protos::auth::{
  PeersDeviceListsRequest, PlatformDetails,
};
use grpc_clients::identity::DeviceType;
use lapin::{options::*, types::FieldTable, ExchangeKind};
use std::time::Duration;
use tokio::time::{interval, Instant};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tokio_util::sync::CancellationToken;
use tracing::{debug, error, info, trace, warn};
use tunnelbroker_messages::farcaster::{
  DirectCastMessage, FarcasterInboxStatus, FarcasterMessage, FarcasterPayload,
  NewFarcasterMessage, RefreshDirectCastConversationPayload,
};

pub(crate) struct TokenConnection {
  db: DatabaseClient,
  config: TokenDistributorConfig,
  token_info: TokenEntryInfo,
  amqp_connection: AmqpConnection,
  grpc_client: ChainedInterceptedServicesAuthClient,
  message_sender: BasicMessageSender,
  blob_client: S2SAuthedBlobClient,
  farcaster_client: FarcasterClient,
  notif_client: GenericNotifClient,
}

impl TokenConnection {
  #[allow(clippy::too_many_arguments)]
  pub(crate) fn start(
    db: DatabaseClient,
    config: TokenDistributorConfig,
    token_info: TokenEntryInfo,
    amqp_connection: AmqpConnection,
    cancellation_token: CancellationToken,
    grpc_client: ChainedInterceptedServicesAuthClient,
    auth_service: &AuthService,
    farcaster_client: FarcasterClient,
  ) {
    let message_sender =
      BasicMessageSender::new(&db, AmqpChannel::new(&amqp_connection));

    let user_id = token_info.user_id.clone();
    let connection = Self {
      db: db.clone(),
      config: config.clone(),
      token_info,
      amqp_connection: amqp_connection.clone(),
      grpc_client,
      blob_client: S2SAuthedBlobClient::new(
        auth_service,
        CONFIG.blob_service_url.clone(),
      ),
      farcaster_client,
      notif_client: GenericNotifClient::new(db.clone(), message_sender.clone()),
      message_sender,
    };

    tokio::spawn(async move {
      let result = connection.run(cancellation_token.clone()).await;

      match result {
        Ok(_) => {
          info!(
            "TokenConnection completed successfully for user: {}",
            redact_sensitive_data(&user_id)
          );
        }
        Err(e) => {
          error!(
            "TokenConnection failed for user {}: {:?}",
            redact_sensitive_data(&user_id),
            e
          );

          // Emit connection failure metric with specific error type
          let error_type = match &e {
            TokenConnectionError::PingTimeout => "PingTimeout",
            TokenConnectionError::WebSocketConnection(_) => {
              "WebSocketConnection"
            }
            TokenConnectionError::AuthenticationFailed(_) => {
              "AuthenticationFailed"
            }
            TokenConnectionError::WebSocketClosed(_) => "WebSocketClosed",
            TokenConnectionError::StreamEnded => "StreamEnded",
            TokenConnectionError::DatabaseError(_) => "DatabaseError",
            TokenConnectionError::TokenOwnershipLost => "TokenOwnershipLost",
            TokenConnectionError::HeartbeatFailed(_) => "HeartbeatFailed",
            TokenConnectionError::Cancelled => "Cancelled",
            TokenConnectionError::AmqpSetupFailed(_) => "AmqpSetupFailed",
            TokenConnectionError::MessageHandlingFailed(_) => {
              "MessageHandlingFailed"
            }
          };

          info!(
            metricType = "TokenDistributor_ConnectionFailure",
            metricValue = 1,
            instanceId = config.instance_id,
            userId = redact_sensitive_data(&user_id),
            errorType = error_type,
            "Connection failure occurred"
          );

          // Clean up token in database on connection failure
          if let Err(release_err) =
            db.release_token(&user_id, &config.instance_id).await
          {
            warn!(
              "Failed to release token for user {} after connection failure: {:?}",
              redact_sensitive_data(&user_id),
              release_err
            );
          }
        }
      }

      // This ensures cleanup_dead_connections() will remove it from the HashMap
      cancellation_token.cancel();
      debug!("Cancelled token for user {} - connection ended", user_id);
    });
  }

  async fn run(
    self,
    cancellation_token: CancellationToken,
  ) -> Result<(), TokenConnectionError> {
    let user_id = &self.token_info.user_id;
    info!(
      "Starting connection for user: {}",
      redact_sensitive_data(user_id)
    );

    loop {
      tokio::select! {
        result = self.connect_and_maintain(&self.token_info.token_data, &cancellation_token) => {
          match result {
            Ok(_) => {
              info!("Connection completed normally for user: {}", redact_sensitive_data(user_id));
              break;
            }
            Err(e) => {
              warn!(
                "Socket connection failed for user {}, reason: {}",
                redact_sensitive_data(user_id),
                e
              );

              // Check if we still own the token before retrying
              debug!(
                "Verifying token ownership for user {} before retry",
                self.token_info.user_id
              );
              match self.db.update_token_heartbeat(user_id, &self.config.instance_id).await {
                Ok(true) => {
                  debug!(
                    "Token ownership confirmed for user {}, restarting socket in 5 seconds",
                    user_id
                  );
                  tokio::time::sleep(Duration::from_secs(5)).await;
                  debug!(
                    "Attempting socket reconnect for user {}",
                    user_id
                  );
                }
                Ok(false) => {
                  warn!(
                    "Lost token ownership for user {}, stopping reconnection attempts",
                   redact_sensitive_data(user_id)
                  );
                  return Err(TokenConnectionError::TokenOwnershipLost);
                }
                Err(err) => {
                  error!(
                    "Failed to verify token ownership for user {}: {:?}, retrying in 5 seconds",
                    redact_sensitive_data(user_id),
                    err
                  );
                  tokio::time::sleep(Duration::from_secs(5)).await;
                }
              }
            }
          }
        }
        _ = cancellation_token.cancelled() => {
          info!("Connection cancelled for user: {}", redact_sensitive_data(user_id));
          return Err(TokenConnectionError::Cancelled);
        }
      }
    }

    info!(
      "TokenConnection ended for user: {}",
      redact_sensitive_data(user_id)
    );
    Ok(())
  }

  async fn connect_and_maintain(
    &self,
    farcaster_token: &str,
    cancellation_token: &CancellationToken,
  ) -> Result<(), TokenConnectionError> {
    let user_id = &self.token_info.user_id;

    debug!(
      "Establishing WebSocket connection for user {} to {}",
      user_id, self.config.farcaster_websocket_url
    );
    let (ws_stream, _) =
      connect_async(&self.config.farcaster_websocket_url).await?;

    debug!("WebSocket connected successfully for user: {}", user_id);

    let (mut write, mut read) = ws_stream.split();

    // Send auth message
    let auth_msg = serde_json::json!({
      "messageType": "dc_authenticate",
      "data": farcaster_token
    });
    debug!("Sending authentication message for user: {}", user_id);
    if let Err(e) = write.send(Message::Text(auth_msg.to_string())).await {
      error!(
        "Failed to send auth message for user {}: {:?}, connection will be retried",
        redact_sensitive_data(user_id),
        e
      );
      return Err(TokenConnectionError::AuthenticationFailed(format!(
        "Failed to send auth message: {}",
        e
      )));
    }

    info!(
      "WebSocket connected and authenticated successfully for user: {}",
      redact_sensitive_data(user_id)
    );

    // Set up AMQP topic listener for farcaster messages
    let topic_name = format!("farcaster_user_{}", user_id);
    let mut amqp_consumer = match self.setup_amqp_consumer(&topic_name).await {
      Ok(consumer) => consumer,
      Err(e) => {
        error!(
          "Failed to setup AMQP consumer for user {}: {}",
          redact_sensitive_data(user_id),
          e
        );
        return Err(TokenConnectionError::AmqpSetupFailed(format!(
          "Failed to setup AMQP consumer: {}",
          e
        )));
      }
    };

    let mut heartbeat_interval = interval(self.config.heartbeat_interval);
    let mut last_ping = Instant::now(); // Track last ping time
    let ping_timeout = tokio::time::sleep(self.config.ping_timeout);
    tokio::pin!(ping_timeout);

    trace!(
      "Ping timeout monitoring active for user: {} - timeout: {}s",
      user_id,
      self.config.ping_timeout.as_secs()
    );

    let mut client = self.grpc_client.clone();

    loop {
      tokio::select! {
        // Handle AMQP messages and forward to WebSocket
        amqp_msg = amqp_consumer.next() => {
          if let Some(delivery_result) = amqp_msg {
            match delivery_result {
              Ok(delivery) => {
                let payload = String::from_utf8_lossy(&delivery.data);
                debug!("Received AMQP message for user {}: {}", self.token_info.user_id, payload);

                // Forward message to WebSocket
                if let Err(e) = write.send(Message::Text(payload.to_string())).await {
                  error!("Failed to forward AMQP message to WebSocket for user {}: {:?}", redact_sensitive_data(user_id), e);
                } else {
                  // Acknowledge the AMQP message
                  if let Err(e) = delivery.ack(BasicAckOptions::default()).await {
                    error!("Failed to acknowledge AMQP message for user {}: {:?}", redact_sensitive_data(user_id), e);
                  }
                  info!("Message {:?} sent", payload);
                }
              }
              Err(e) => {
                error!("AMQP consumer error for user {}: {:?}", redact_sensitive_data(user_id), e);
              }
            }
          }
        }

        msg = read.next() => {
          match msg {
            Some(Ok(msg)) => match msg {
              Message::Text(text) => {
                debug!("Received message for {}: {}", self.token_info.user_id, text);
                match serde_json::from_str::<FarcasterMessage>(&text) {
                  Ok(farcaster_msg) => {
                    match &farcaster_msg.payload {
                      FarcasterPayload::RefreshDirectCastConversation { payload, .. } => {
                        if let Err(e) = self.handle_refresh_conversation(
                          payload,
                          &mut client,
                        ).await {
                          info!(
                            metricType = "TokenDistributor_ConnectionFailure",
                            metricValue = 1,
                            instanceId = self.config.instance_id,
                            userId = redact_sensitive_data(user_id),
                            errorType = "MessageHandlingFailed",
                            "Failed to handle refresh direct cast conversation: {:?}",
                            e
                          );
                        }
                      }
                      FarcasterPayload::RefreshSelfDirectCastsInbox { .. } => {
                        debug!("Processing refresh-self-direct-casts-inbox message");
                      }
                      FarcasterPayload::Unseen { .. } => {
                        if let Err(e) = self.handle_unseen_message(&mut client).await {
                          info!(
                            metricType = "TokenDistributor_ConnectionFailure",
                            metricValue = 1,
                            instanceId = self.config.instance_id,
                            userId = redact_sensitive_data(user_id),
                            errorType = "MessageHandlingFailed",
                            "Failed to handle unseen message: {:?}",
                            e
                          );
                        }
                      }
                    }
                  }
                  Err(e) => {
                    warn!("Failed to parse message as Farcaster format: {}", e);
                  }
                }
              }
              Message::Binary(_data) => {
                debug!("Received binary message for user: {}", user_id);
              }
              Message::Frame(_) => {
                debug!("Received raw frame for user: {}", user_id);
              }
              Message::Ping(data) => {
                let elapsed_since_last = last_ping.elapsed();
                trace!("Received ping for user: {} ({}s since last ping), responding with pong",
                       user_id, elapsed_since_last.as_secs());
                last_ping = Instant::now(); // Reset ping timeout
                ping_timeout.as_mut().reset(Instant::now() + self.config.ping_timeout);
                let _ = write.send(Message::Pong(data)).await;
              }
              Message::Pong(_data) => {
                trace!("Received pong for user: {}", user_id);
              }
              Message::Close(close_frame) => {
                let reason = if let Some(frame) = close_frame {
                  let msg = format!("code: {}, reason: {}", frame.code, frame.reason);
                  error!("WebSocket closed for user {} - {}", redact_sensitive_data(user_id), msg);
                  msg
                } else {
                  error!("WebSocket closed for user {} without close frame", redact_sensitive_data(user_id));
                  "no close frame provided".to_string()
                };
                return Err(TokenConnectionError::WebSocketClosed(reason));
              }
            }
            Some(Err(e)) => {
              warn!(
                "WebSocket protocol error for user {}: {:?}, connection will be restarted",
                redact_sensitive_data(user_id),
                e
              );
              return Err(TokenConnectionError::WebSocketConnection(e));
            }
            None => {
              info!(
                "WebSocket stream ended unexpectedly for user: {}, connection will be restarted",
               redact_sensitive_data(user_id)
              );
              return Err(TokenConnectionError::StreamEnded);
            }
          }
        }

        // Send heartbeat updates
        _ = heartbeat_interval.tick() => {
          match self.db.update_token_heartbeat(user_id, &self.config.instance_id).await {
            Ok(true) => {
              trace!("Heartbeat updated successfully for user: {}", user_id);
            }
            Ok(false) => {
              warn!(
                "Lost token ownership for user: {} - another instance may have claimed it",
               redact_sensitive_data(user_id)
              );
              return Err(TokenConnectionError::TokenOwnershipLost);
            }
            Err(e) => {
              error!(
                "Failed to update heartbeat for user {}: {:?}",
                redact_sensitive_data(user_id),
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
            redact_sensitive_data(user_id), elapsed.as_secs()
          );
          return Err(TokenConnectionError::PingTimeout);
        }

        // Handle cancellation
        _ = cancellation_token.cancelled() => {
          info!("Connection cancelled for user: {}, closing WebSocket", redact_sensitive_data(user_id));

          // Send close frame before terminating
          let _ = write.send(Message::Close(None)).await;

          return Err(TokenConnectionError::Cancelled);
        }
      }
    }
  }

  async fn setup_amqp_consumer(
    &self,
    topic_name: &str,
  ) -> Result<lapin::Consumer, lapin::Error> {
    let channel = self.amqp_connection.new_channel().await?;

    // Declare exchange
    channel
      .exchange_declare(
        topic_name,
        ExchangeKind::Direct,
        ExchangeDeclareOptions::default(),
        FieldTable::default(),
      )
      .await?;

    // Declare queue with unique name for this connection
    let queue_name = format!("{}_{}", topic_name, self.token_info.user_id);
    let queue = channel
      .queue_declare(
        &queue_name,
        QueueDeclareOptions {
          auto_delete: true,
          exclusive: true,
          ..QueueDeclareOptions::default()
        },
        FieldTable::default(),
      )
      .await?;

    // Bind queue to exchange
    channel
      .queue_bind(
        queue.name().as_str(),
        topic_name,
        "",
        QueueBindOptions::default(),
        FieldTable::default(),
      )
      .await?;

    // Create consumer
    let consumer = channel
      .basic_consume(
        queue.name().as_str(),
        &format!("consumer_{}_{}", topic_name, self.token_info.user_id),
        BasicConsumeOptions::default(),
        FieldTable::default(),
      )
      .await?;

    debug!(
      "AMQP consumer set up for topic: {} user: {}",
      topic_name, self.token_info.user_id
    );
    Ok(consumer)
  }

  async fn handle_refresh_conversation(
    &self,
    payload: &RefreshDirectCastConversationPayload,
    client: &mut ChainedInterceptedServicesAuthClient,
  ) -> Result<(), TokenConnectionError> {
    debug!(
      "Handling refresh direct cast conversation for user: {}",
      self.token_info.user_id
    );

    let conversation_id = &payload.conversation_id;
    debug!(
      "Processing refresh for conversation ID: {}",
      conversation_id
    );

    let notif_payload_future = async || {
      let conversation = self
        .farcaster_client
        .fetch_conversation(&self.token_info.user_id, conversation_id)
        .await
        .map_err(|e| {
          TokenConnectionError::MessageHandlingFailed(format!(
            "Failed to fetch conversation details: {e:?}",
          ))
        })?;
      let notif =
        prepare_notif_payload(payload, &conversation, &self.token_info.fid);
      Ok::<_, TokenConnectionError>(notif)
    };

    let message_payload_future = async || {
      let mut direct_cast_message = payload.message.clone();
      if let Some(medias) = replace_media_urls(&mut direct_cast_message) {
        if let Err(err) = self.mirror_media_to_blob(medias).await {
          if matches!(err, crate::farcaster::error::Error::Timeout) {
            info!(
              "Timeout when mirroring multimedia. Falling back to originals."
            );
          } else {
            warn!("Failed to mirror multimedia to blob: {err:?}");
          }
          direct_cast_message = payload.message.clone();
        }
      } else {
        direct_cast_message = payload.message.clone();
      }

      let message = NewFarcasterMessage {
        message: direct_cast_message,
      };
      let message_payload = serde_json::to_string(&message).map_err(|e| {
        TokenConnectionError::MessageHandlingFailed(format!(
          "Failed to serialize: {}",
          e
        ))
      })?;
      Ok::<_, TokenConnectionError>(message_payload)
    };

    let recipient_devices = self.get_self_user_device_list(client).await?;

    let (message_payload_result, notif_payload_result) =
      tokio::join!(message_payload_future(), notif_payload_future());

    let message_payload = message_payload_result?;
    let notif: Option<_> = match notif_payload_result {
      Ok(notif_payload) => notif_payload,
      Err(err) => {
        tracing::error!("Failed to prepare notif payload: {:?}", err);
        None
      }
    };

    for (device_id, platform_details) in &recipient_devices {
      let notif_future = async || {
        let Some(notif_payload) = &notif else {
          return;
        };
        let Ok(platform) = platform_details.device_type().try_into() else {
          return;
        };
        let target = NotifRecipientDescriptor {
          platform,
          device_id: device_id.to_string(),
        };
        if let Err(err) = self
          .notif_client
          .send_notif(notif_payload.clone(), target)
          .await
        {
          if !err.is_invalid_token() {
            tracing::error!("Failed to send Farcaster notif: {:?}", err);
          }
        }
      };

      let message_future = async || {
        self
          .message_sender
          .simple_send_message_to_device(device_id, message_payload.clone())
          .await
          .map_err(|e| {
            TokenConnectionError::MessageHandlingFailed(format!(
              "Failed to send a message: {}",
              e
            ))
          })
      };

      let (message_result, _) = tokio::join!(message_future(), notif_future());
      message_result?;
    }

    Ok(())
  }

  async fn get_self_user_device_list(
    &self,
    client: &mut ChainedInterceptedServicesAuthClient,
  ) -> Result<Vec<(String, PlatformDetails)>, TokenConnectionError> {
    let request = PeersDeviceListsRequest {
      user_ids: vec![self.token_info.user_id.clone()],
    };
    let mut user_devices_response = client
      .get_device_lists_for_users(request)
      .await
      .map_err(|e| {
        TokenConnectionError::MessageHandlingFailed(format!(
          "Failed to get user devices: {}",
          e
        ))
      })?
      .into_inner();

    let Some(user_devices) = user_devices_response
      .users_devices_platform_details
      .remove(&self.token_info.user_id)
    else {
      return Ok(Vec::new());
    };

    // Filter out keyservers
    let result = user_devices
      .devices_platform_details
      .into_iter()
      .filter(|(_, platform_details)| {
        platform_details.device_type() != DeviceType::Keyserver
      })
      .collect();
    Ok(result)
  }

  async fn handle_unseen_message(
    &self,
    client: &mut ChainedInterceptedServicesAuthClient,
  ) -> Result<(), TokenConnectionError> {
    let conversations = self
      .farcaster_client
      .fetch_inbox(&self.token_info.user_id)
      .await
      .map_err(|e| {
        TokenConnectionError::MessageHandlingFailed(format!(
          "Failed to fetch inbox: {e:?}",
        ))
      })?;

    let mut unread_conversation_ids = Vec::new();
    let mut read_conversation_ids = Vec::new();

    for conversation in conversations {
      if conversation.viewer_context.unread_count > 0
        || conversation.viewer_context.manually_marked_unread
      {
        unread_conversation_ids.push(conversation.conversation_id);
      } else {
        read_conversation_ids.push(conversation.conversation_id);
      }
    }

    let inbox_status = FarcasterInboxStatus {
      unread_conversation_ids,
      read_conversation_ids,
    };

    let message_payload =
      serde_json::to_string(&inbox_status).map_err(|e| {
        TokenConnectionError::MessageHandlingFailed(format!(
          "Failed to serialize inbox status: {}",
          e
        ))
      })?;

    let recipient_devices = self.get_self_user_device_list(client).await?;

    for (device_id, _) in &recipient_devices {
      self
        .message_sender
        .simple_send_message_to_device(device_id, message_payload.clone())
        .await
        .map_err(|e| {
          TokenConnectionError::MessageHandlingFailed(format!(
            "Failed to send inbox status message: {}",
            e
          ))
        })?;
    }

    Ok(())
  }

  async fn mirror_media_to_blob(
    &self,
    medias: Vec<MirroredMediaInfo>,
  ) -> Result<(), crate::farcaster::error::Error> {
    if medias.is_empty() {
      return Ok(());
    }
    let blob_client = self.blob_client.clone();
    let task = tokio::spawn(async move {
      blob_client.auth().await?.mirror_multimedia(medias).await?;
      Ok::<_, crate::farcaster::error::Error>(())
    });

    match tokio::time::timeout(MEDIA_MIRROR_TIMEOUT, task).await {
      Ok(Ok(task_result)) => task_result,
      _ => Ok(()),
    }
  }
}

fn replace_media_urls(
  message: &mut DirectCastMessage,
) -> Option<Vec<MirroredMediaInfo>> {
  let media_base_url = CONFIG.blob_service_public_url.join("media/").ok()?;

  let mut found_medias: Vec<MirroredMediaInfo> = Vec::new();

  let medias = message
    .extra
    .get_mut("metadata")
    .and_then(|metadata| metadata.get_mut("medias"))
    .and_then(|m| m.as_array_mut())?;

  for media in medias {
    let original_media = media.clone();
    let Some(url) = media.get_mut("staticRaster") else {
      continue;
    };
    let Some(original_url) = url.as_str() else {
      continue;
    };
    if original_url.starts_with(media_base_url.as_str()) {
      continue;
    }

    let original_metadata = serde_json::to_string(&original_media).ok()?;
    found_medias.push(MirroredMediaInfo {
      url: original_url.to_string(),
      original_metadata,
    });

    let urlencoded_original = urlencoding::encode(original_url);
    let new_url = media_base_url.join(&urlencoded_original).ok()?.to_string();
    tracing::trace!(
      "Replaced media URL '{}' with '{}'",
      original_url,
      &new_url
    );
    *url = serde_json::Value::String(new_url);
  }

  Some(found_medias)
}
