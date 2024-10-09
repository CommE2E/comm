use crate::amqp::{is_connection_error, AmqpConnection};
use crate::constants::{
  error_types, CLIENT_RMQ_MSG_PRIORITY, DDB_RMQ_MSG_PRIORITY,
  MAX_RMQ_MSG_PRIORITY, RMQ_CONSUMER_TAG,
};
use crate::notifs::wns::response::WNSErrorResponse;
use comm_lib::aws::ddb::error::SdkError;
use comm_lib::aws::ddb::operation::put_item::PutItemError;
use derive_more;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
use futures_util::StreamExt;
use hyper_tungstenite::{tungstenite::Message, WebSocketStream};
use lapin::message::Delivery;
use lapin::options::{
  BasicCancelOptions, BasicConsumeOptions, BasicPublishOptions,
  QueueDeclareOptions, QueueDeleteOptions,
};
use lapin::types::FieldTable;
use lapin::BasicProperties;
use notifs::fcm::error::Error::FCMError as NotifsFCMError;
use notifs::web_push::error::Error::WebPush as NotifsWebPushError;
use notifs::wns::error::Error::WNSNotification as NotifsWNSError;
use reqwest::Url;
use tokio::io::AsyncRead;
use tokio::io::AsyncWrite;
use tracing::{debug, error, info, trace, warn};
use tunnelbroker_messages::bad_device_token::BadDeviceToken;
use tunnelbroker_messages::Platform;
use tunnelbroker_messages::{
  message_to_device_request_status::Failure,
  message_to_device_request_status::MessageSentStatus, session::DeviceTypes,
  DeviceToTunnelbrokerMessage, Heartbeat, MessageToDevice,
  MessageToDeviceRequest, MessageToTunnelbroker,
};
use web_push::WebPushError;

use crate::notifs::apns::response::ErrorReason;

use crate::database::{self, DatabaseClient, MessageToDeviceExt};
use crate::notifs::apns::headers::NotificationHeaders;
use crate::notifs::apns::APNsNotif;
use crate::notifs::fcm::firebase_message::{
  AndroidConfig, AndroidMessagePriority, FCMMessage,
};
use crate::notifs::web_push::WebPushNotif;
use crate::notifs::wns::WNSNotif;
use crate::notifs::{apns, NotifClient, NotifClientType};
use crate::{identity, notifs};

pub struct DeviceInfo {
  pub device_id: String,
  pub notify_token: Option<String>,
  pub device_type: DeviceTypes,
  pub device_app_version: Option<String>,
  pub device_os: Option<String>,
  pub is_authenticated: bool,
}

pub struct WebsocketSession<S> {
  tx: SplitSink<WebSocketStream<S>, Message>,
  db_client: DatabaseClient,
  pub device_info: DeviceInfo,
  amqp: AmqpConnection,
  amqp_channel: lapin::Channel,
  // Stream of messages from AMQP endpoint
  amqp_consumer: lapin::Consumer,
  notif_client: NotifClient,
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum SessionError {
  InvalidMessage,
  SerializationError(serde_json::Error),
  MessageError(database::MessageErrors),
  AmqpError(lapin::Error),
  InternalError,
  UnauthorizedDevice,
  PersistenceError(SdkError<PutItemError>),
  DatabaseError(comm_lib::database::Error),
  MissingAPNsClient,
  MissingFCMClient,
  MissingWebPushClient,
  MissingWNSClient,
  MissingDeviceToken,
  InvalidDeviceToken,
  InvalidNotifProvider,
  InvalidDeviceTokenUpload,
}

// Parse a session request and retrieve the device information
pub async fn handle_first_message_from_device(
  message: &str,
) -> Result<DeviceInfo, SessionError> {
  let serialized_message =
    serde_json::from_str::<DeviceToTunnelbrokerMessage>(message)?;

  match serialized_message {
    DeviceToTunnelbrokerMessage::ConnectionInitializationMessage(
      mut session_info,
    ) => {
      let device_info = DeviceInfo {
        device_id: session_info.device_id.clone(),
        notify_token: session_info.notify_token.take(),
        device_type: session_info.device_type,
        device_app_version: session_info.device_app_version.take(),
        device_os: session_info.device_os.take(),
        is_authenticated: true,
      };

      // Authenticate device
      debug!("Authenticating device: {}", &session_info.device_id);
      let auth_request = identity::verify_user_access_token(
        &session_info.user_id,
        &device_info.device_id,
        &session_info.access_token,
      )
      .await;

      match auth_request {
        Err(e) => {
          error!(
            errorType = error_types::IDENTITY_ERROR,
            "Failed to complete request to identity service: {:?}", e
          );
          return Err(SessionError::InternalError);
        }
        Ok(false) => {
          info!("Device failed authentication: {}", &session_info.device_id);
          return Err(SessionError::UnauthorizedDevice);
        }
        Ok(true) => {
          debug!(
            "Successfully authenticated device: {}",
            &session_info.device_id
          );
        }
      }

      Ok(device_info)
    }
    DeviceToTunnelbrokerMessage::AnonymousInitializationMessage(
      session_info,
    ) => {
      debug!(
        "Starting unauthenticated session with device: {}",
        &session_info.device_id
      );
      let device_info = DeviceInfo {
        device_id: session_info.device_id,
        device_type: session_info.device_type,
        device_app_version: session_info.device_app_version,
        device_os: session_info.device_os,
        is_authenticated: false,
        notify_token: None,
      };
      Ok(device_info)
    }
    _ => {
      debug!("Received invalid request");
      Err(SessionError::InvalidMessage)
    }
  }
}

async fn publish_persisted_messages(
  db_client: &DatabaseClient,
  amqp_channel: &lapin::Channel,
  device_info: &DeviceInfo,
) -> Result<(), SessionError> {
  let messages = db_client
    .retrieve_messages(&device_info.device_id)
    .await
    .unwrap_or_else(|e| {
      error!(
        errorType = error_types::DDB_ERROR,
        "Error while retrieving messages: {}", e
      );
      Vec::new()
    });

  for message in messages {
    let message_to_device = MessageToDevice::from_hashmap(message)?;

    let serialized_message = serde_json::to_string(&message_to_device)?;

    amqp_channel
      .basic_publish(
        "",
        &message_to_device.device_id,
        BasicPublishOptions::default(),
        serialized_message.as_bytes(),
        BasicProperties::default().with_priority(DDB_RMQ_MSG_PRIORITY),
      )
      .await?;
  }

  debug!("Flushed messages for device: {}", &device_info.device_id);
  Ok(())
}

pub async fn get_device_info_from_frame(
  frame: Message,
) -> Result<DeviceInfo, SessionError> {
  let device_info = match frame {
    Message::Text(payload) => {
      handle_first_message_from_device(&payload).await?
    }
    _ => {
      debug!("Client sent wrong frame type for establishing connection");
      return Err(SessionError::InvalidMessage);
    }
  };
  Ok(device_info)
}

impl<S: AsyncRead + AsyncWrite + Unpin> WebsocketSession<S> {
  pub async fn new(
    tx: SplitSink<WebSocketStream<S>, Message>,
    db_client: DatabaseClient,
    device_info: DeviceInfo,
    amqp: AmqpConnection,
    notif_client: NotifClient,
  ) -> Result<Self, super::ErrorWithStreamHandle<S>> {
    let (amqp_channel, amqp_consumer) =
      match Self::init_amqp(&device_info, &db_client, &amqp).await {
        Ok(consumer) => consumer,
        Err(err) => return Err((err, tx)),
      };

    Ok(Self {
      tx,
      db_client,
      device_info,
      amqp,
      amqp_channel,
      amqp_consumer,
      notif_client,
    })
  }

  async fn init_amqp(
    device_info: &DeviceInfo,
    db_client: &DatabaseClient,
    amqp: &AmqpConnection,
  ) -> Result<(lapin::Channel, lapin::Consumer), SessionError> {
    let amqp_channel = amqp.new_channel().await?;
    debug!(
      "Got AMQP Channel Id={} for device '{}'",
      amqp_channel.id(),
      device_info.device_id
    );

    let mut args = FieldTable::default();
    args.insert("x-max-priority".into(), MAX_RMQ_MSG_PRIORITY.into());
    amqp_channel
      .queue_declare(
        &device_info.device_id,
        QueueDeclareOptions::default(),
        args,
      )
      .await?;

    publish_persisted_messages(db_client, &amqp_channel, device_info).await?;

    let amqp_consumer = amqp_channel
      .basic_consume(
        &device_info.device_id,
        RMQ_CONSUMER_TAG,
        BasicConsumeOptions {
          no_ack: true,
          ..Default::default()
        },
        FieldTable::default(),
      )
      .await?;
    Ok((amqp_channel, amqp_consumer))
  }

  fn is_amqp_channel_dead(&self) -> bool {
    !self.amqp_channel.status().connected()
  }

  async fn publish_amqp_message_to_device(
    &mut self,
    device_id: &str,
    payload: &[u8],
  ) -> Result<lapin::publisher_confirm::PublisherConfirm, SessionError> {
    if self.is_amqp_channel_dead() {
      self.reset_failed_amqp().await?;
    }
    let publish_result = self
      .amqp_channel
      .basic_publish(
        "",
        device_id,
        BasicPublishOptions::default(),
        payload,
        BasicProperties::default().with_priority(CLIENT_RMQ_MSG_PRIORITY),
      )
      .await?;
    Ok(publish_result)
  }

  pub async fn reset_failed_amqp(&mut self) -> Result<(), SessionError> {
    if self.amqp_channel.status().connected()
      && self.amqp_consumer.state().is_active()
    {
      return Ok(());
    }
    debug!(
      "Resetting failed amqp for session with {}",
      &self.device_info.device_id
    );

    let (amqp_channel, amqp_consumer) =
      Self::init_amqp(&self.device_info, &self.db_client, &self.amqp).await?;

    self.amqp_channel = amqp_channel;
    self.amqp_consumer = amqp_consumer;

    Ok(())
  }

  pub async fn handle_message_to_device(
    &mut self,
    message_request: &MessageToDeviceRequest,
  ) -> Result<(), SessionError> {
    let message_id = self
      .db_client
      .persist_message(
        &message_request.device_id,
        &message_request.payload,
        &message_request.client_message_id,
      )
      .await?;

    let message_to_device = MessageToDevice {
      device_id: message_request.device_id.clone(),
      payload: message_request.payload.clone(),
      message_id: message_id.clone(),
    };

    let serialized_message = serde_json::to_string(&message_to_device)?;

    let publish_result = self
      .publish_amqp_message_to_device(
        &message_request.device_id,
        serialized_message.as_bytes(),
      )
      .await;

    if let Err(amqp_session_error) = publish_result {
      self
        .db_client
        .delete_message(&self.device_info.device_id, &message_id)
        .await
        .expect("Error deleting message");
      return Err(amqp_session_error);
    }
    Ok(())
  }

  pub async fn handle_message_to_tunnelbroker(
    &self,
    message_to_tunnelbroker: &MessageToTunnelbroker,
  ) -> Result<(), SessionError> {
    match message_to_tunnelbroker {
      MessageToTunnelbroker::SetDeviceToken(token) => {
        self
          .db_client
          .set_device_token(
            &self.device_info.device_id,
            &token.device_token,
            None,
          )
          .await?;
      }
      MessageToTunnelbroker::SetDeviceTokenWithPlatform(
        token_with_platform,
      ) => {
        if matches!(token_with_platform.platform, Platform::Windows) {
          Url::parse(&token_with_platform.device_token)
            .ok()
            .filter(|url| {
              url
                .domain()
                .is_some_and(|domain| domain.ends_with("notify.windows.com"))
            })
            .ok_or_else(|| {
              debug!(
                device_token = &token_with_platform.device_token,
                device_id = &self.device_info.device_id,
                "Invalid Windows device token"
              );
              SessionError::InvalidDeviceTokenUpload
            })?;
        }
        self
          .db_client
          .set_device_token(
            &self.device_info.device_id,
            &token_with_platform.device_token,
            Some(token_with_platform.platform.clone()),
          )
          .await?;
      }
    }

    Ok(())
  }

  pub async fn handle_websocket_frame_from_device(
    &mut self,
    msg: String,
  ) -> Option<MessageSentStatus> {
    let Ok(serialized_message) =
      serde_json::from_str::<DeviceToTunnelbrokerMessage>(&msg)
    else {
      return Some(MessageSentStatus::SerializationError(msg));
    };

    match serialized_message {
      DeviceToTunnelbrokerMessage::Heartbeat(Heartbeat {}) => {
        trace!("Received heartbeat from: {}", self.device_info.device_id);
        None
      }
      DeviceToTunnelbrokerMessage::MessageReceiveConfirmation(confirmation) => {
        for message_id in confirmation.message_ids {
          if let Err(e) = self
            .db_client
            .delete_message(&self.device_info.device_id, &message_id)
            .await
          {
            error!(
              errorType = error_types::DDB_ERROR,
              "Failed to delete message: {}:", e
            );
          }
        }

        None
      }
      DeviceToTunnelbrokerMessage::MessageToDeviceRequest(message_request) => {
        // unauthenticated clients cannot send messages
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send text message. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        debug!("Received message for {}", message_request.device_id);

        let result = self.handle_message_to_device(&message_request).await;
        Some(self.get_message_to_device_status(
          &message_request.client_message_id,
          result,
        ))
      }
      DeviceToTunnelbrokerMessage::MessageToTunnelbrokerRequest(
        message_request,
      ) => {
        // unauthenticated clients cannot send messages
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send text message. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        debug!("Received message for Tunnelbroker");

        let Ok(message_to_tunnelbroker) =
          serde_json::from_str(&message_request.payload)
        else {
          return Some(MessageSentStatus::SerializationError(
            message_request.payload,
          ));
        };

        let result = self
          .handle_message_to_tunnelbroker(&message_to_tunnelbroker)
          .await;
        Some(self.get_message_to_device_status(
          &message_request.client_message_id,
          result,
        ))
      }
      DeviceToTunnelbrokerMessage::APNsNotif(notif) => {
        // unauthenticated clients cannot send notifs
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send text notif. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        debug!("Received APNs notif for {}", notif.device_id);

        let Ok(headers) =
          serde_json::from_str::<NotificationHeaders>(&notif.headers)
        else {
          return Some(MessageSentStatus::SerializationError(notif.headers));
        };

        let device_token = match self
          .get_device_token(notif.device_id.clone(), NotifClientType::APNs)
          .await
        {
          Ok(token) => token,
          Err(e) => {
            return Some(
              self
                .get_message_to_device_status(&notif.client_message_id, Err(e)),
            )
          }
        };

        let apns_notif = APNsNotif {
          device_token: device_token.clone(),
          headers,
          payload: notif.payload,
        };

        if let Some(apns) = self.notif_client.apns.clone() {
          let response = apns.send(apns_notif).await;
          if let Err(apns::error::Error::ResponseError(body)) = &response {
            if matches!(
              body.reason,
              ErrorReason::BadDeviceToken
                | ErrorReason::Unregistered
                | ErrorReason::ExpiredToken
            ) {
              if let Err(e) = self
                .invalidate_device_token(notif.device_id, device_token.clone())
                .await
              {
                error!(
                  errorType = error_types::DDB_ERROR,
                  "Error invalidating device token {}: {:?}", device_token, e
                );
              };
            }
          }
          return Some(
            self
              .get_message_to_device_status(&notif.client_message_id, response),
          );
        }

        Some(self.get_message_to_device_status(
          &notif.client_message_id,
          Err(SessionError::MissingAPNsClient),
        ))
      }
      DeviceToTunnelbrokerMessage::FCMNotif(notif) => {
        // unauthenticated clients cannot send notifs
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send text notif. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        debug!("Received FCM notif for {}", notif.device_id);

        let Some(priority) = AndroidMessagePriority::from_str(&notif.priority)
        else {
          return Some(MessageSentStatus::SerializationError(notif.priority));
        };

        let Ok(data) = serde_json::from_str(&notif.data) else {
          return Some(MessageSentStatus::SerializationError(notif.data));
        };

        let device_token = match self
          .get_device_token(notif.device_id.clone(), NotifClientType::FCM)
          .await
        {
          Ok(token) => token,
          Err(e) => {
            return Some(
              self
                .get_message_to_device_status(&notif.client_message_id, Err(e)),
            )
          }
        };

        let fcm_message = FCMMessage {
          data,
          token: device_token.to_string(),
          android: AndroidConfig { priority },
        };

        if let Some(fcm) = self.notif_client.fcm.clone() {
          let result = fcm.send(fcm_message).await;

          if let Err(NotifsFCMError(fcm_error)) = &result {
            if fcm_error.should_invalidate_token() {
              if let Err(e) = self
                .invalidate_device_token(notif.device_id, device_token.clone())
                .await
              {
                error!(
                  errorType = error_types::DDB_ERROR,
                  "Error invalidating device token {}: {:?}", device_token, e
                );
              };
            }
          }
          return Some(
            self.get_message_to_device_status(&notif.client_message_id, result),
          );
        }

        Some(self.get_message_to_device_status(
          &notif.client_message_id,
          Err(SessionError::MissingFCMClient),
        ))
      }
      DeviceToTunnelbrokerMessage::WebPushNotif(notif) => {
        // unauthenticated clients cannot send notifs
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send web push notif. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        debug!("Received WebPush notif for {}", notif.device_id);

        let Some(web_push_client) = self.notif_client.web_push.clone() else {
          return Some(self.get_message_to_device_status(
            &notif.client_message_id,
            Err(SessionError::MissingWebPushClient),
          ));
        };

        let device_token = match self
          .get_device_token(notif.device_id.clone(), NotifClientType::WebPush)
          .await
        {
          Ok(token) => token,
          Err(e) => {
            return Some(
              self
                .get_message_to_device_status(&notif.client_message_id, Err(e)),
            )
          }
        };

        let web_push_notif = WebPushNotif {
          device_token: device_token.clone(),
          payload: notif.payload,
        };

        let result = web_push_client.send(web_push_notif).await;
        if let Err(NotifsWebPushError(web_push_error)) = &result {
          if matches!(
            web_push_error,
            WebPushError::EndpointNotValid | WebPushError::EndpointNotFound
          ) {
            if let Err(e) = self
              .invalidate_device_token(notif.device_id, device_token.clone())
              .await
            {
              error!(
                errorType = error_types::DDB_ERROR,
                "Error invalidating device token {}: {:?}", device_token, e
              );
            };
          }
        }
        Some(
          self.get_message_to_device_status(&notif.client_message_id, result),
        )
      }
      DeviceToTunnelbrokerMessage::WNSNotif(notif) => {
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send WNS notif. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        debug!("Received WNS notif for {}", notif.device_id);

        let Some(wns_client) = self.notif_client.wns.clone() else {
          return Some(self.get_message_to_device_status(
            &notif.client_message_id,
            Err(SessionError::MissingWNSClient),
          ));
        };

        let device_token = match self
          .get_device_token(notif.device_id.clone(), NotifClientType::WNS)
          .await
        {
          Ok(token) => token,
          Err(e) => {
            return Some(
              self
                .get_message_to_device_status(&notif.client_message_id, Err(e)),
            )
          }
        };

        let wns_notif = WNSNotif {
          device_token: device_token.clone(),
          payload: notif.payload,
        };

        let result = wns_client.send(wns_notif).await;
        if let Err(NotifsWNSError(err)) = &result {
          if matches!(err, WNSErrorResponse::NotFound | WNSErrorResponse::Gone)
          {
            if let Err(e) = self
              .invalidate_device_token(notif.device_id, device_token.clone())
              .await
            {
              error!(
                errorType = error_types::DDB_ERROR,
                "Error invalidating device token {}: {:?}", device_token, e
              );
            };
          }
        }
        Some(
          self.get_message_to_device_status(&notif.client_message_id, result),
        )
      }
      _ => {
        error!("Client sent invalid message type");
        Some(MessageSentStatus::InvalidRequest)
      }
    }
  }

  pub async fn next_amqp_message(
    &mut self,
  ) -> Option<Result<Delivery, lapin::Error>> {
    self.amqp_consumer.next().await
  }

  pub async fn send_message_to_device(&mut self, message: Message) {
    if let Err(e) = self.tx.send(message).await {
      error!(
        errorType = error_types::WEBSOCKET_ERROR,
        "Failed to send message to device: {}", e
      );
    }
  }

  // Release WebSocket and remove from active connections
  pub async fn close(&mut self) {
    if let Err(e) = self.tx.close().await {
      debug!("Failed to close WebSocket session: {}", e);
    }

    if self.is_amqp_channel_dead() {
      warn!("AMQP channel or connection dead when closing WS session.");
      self.amqp.maybe_reconnect_in_background();
      return;
    }

    if let Err(e) = self
      .amqp_channel
      .basic_cancel(
        self.amqp_consumer.tag().as_str(),
        BasicCancelOptions::default(),
      )
      .await
    {
      if !is_connection_error(&e) {
        error!(
          errorType = error_types::AMQP_ERROR,
          "Failed to cancel consumer: {}", e
        );
      }
    }

    if let Err(e) = self
      .amqp_channel
      .queue_delete(
        self.device_info.device_id.as_str(),
        QueueDeleteOptions::default(),
      )
      .await
    {
      if !is_connection_error(&e) {
        error!(
          errorType = error_types::AMQP_ERROR,
          "Failed to delete queue: {}", e
        );
      }
    }
  }

  pub fn get_message_to_device_status<E>(
    &mut self,
    client_message_id: &str,
    result: Result<(), E>,
  ) -> MessageSentStatus
  where
    E: std::error::Error,
  {
    match result {
      Ok(()) => MessageSentStatus::Success(client_message_id.to_string()),
      Err(err) => MessageSentStatus::Error(Failure {
        id: client_message_id.to_string(),
        error: err.to_string(),
      }),
    }
  }

  async fn get_device_token(
    &self,
    device_id: String,
    client: NotifClientType,
  ) -> Result<String, SessionError> {
    let db_token = self
      .db_client
      .get_device_token(&device_id)
      .await
      .map_err(SessionError::DatabaseError)?;

    match db_token {
      Some(token) => {
        if let Some(platform) = token.platform {
          if !client.supported_platform(platform) {
            return Err(SessionError::InvalidNotifProvider);
          }
        }
        if token.token_invalid {
          Err(SessionError::InvalidDeviceToken)
        } else {
          Ok(token.device_token)
        }
      }
      None => Err(SessionError::MissingDeviceToken),
    }
  }

  async fn invalidate_device_token(
    &mut self,
    device_id: String,
    invalidated_token: String,
  ) -> Result<(), SessionError> {
    let bad_device_token_message = BadDeviceToken { invalidated_token };
    let payload = serde_json::to_string(&bad_device_token_message)?;
    let message_request = MessageToDeviceRequest {
      client_message_id: uuid::Uuid::new_v4().to_string(),
      device_id: device_id.to_string(),
      payload,
    };

    self.handle_message_to_device(&message_request).await?;

    self
      .db_client
      .mark_device_token_as_invalid(&device_id)
      .await
      .map_err(SessionError::DatabaseError)?;

    Ok(())
  }
}
