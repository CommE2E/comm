use crate::amqp_client::amqp::AmqpConnection;
use crate::constants::error_types;
use comm_lib::aws::ddb::error::SdkError;
use comm_lib::aws::ddb::operation::put_item::PutItemError;
use derive_more;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
use hyper_tungstenite::{tungstenite::Message, WebSocketStream};
use lapin::message::Delivery;
use notifs::fcm::error::Error::FCMError as NotifsFCMError;
use notifs::web_push::error::Error::WebPush as NotifsWebPushError;
use notifs::wns::error::Error::WNSNotification as NotifsWNSError;
use reqwest::Url;
use tokio::io::AsyncRead;
use tokio::io::AsyncWrite;
use tracing::{debug, error, info, trace};
use tunnelbroker_messages::bad_device_token::BadDeviceToken;
use tunnelbroker_messages::{
  message_to_device_request_status::MessageSentStatus, session::DeviceTypes,
  DeviceToTunnelbrokerMessage, Heartbeat, MessageToDeviceRequest,
  MessageToTunnelbroker,
};
use tunnelbroker_messages::{DeviceToTunnelbrokerRequestStatus, Platform};
use web_push::WebPushError;

use crate::amqp_client::AmqpClient;
use crate::database::{self, DatabaseClient};
use crate::notifs::apns::headers::NotificationHeaders;
use crate::notifs::apns::APNsNotif;
use crate::notifs::fcm::firebase_message::{
  AndroidConfig, AndroidMessagePriority, FCMMessage,
};
use crate::notifs::web_push::WebPushNotif;
use crate::notifs::wns::WNSNotif;
use crate::notifs::{apns, NotifClient, NotifClientType};
use crate::{identity, notifs};

#[derive(Clone)]
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
  // Each websocket has an AMQP connection associated with a particular device
  amqp_client: AmqpClient,
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
    let amqp_client =
      match AmqpClient::new(db_client.clone(), device_info.clone(), amqp).await
      {
        Ok(client) => client,
        Err(err) => return Err((err, tx)),
      };

    Ok(Self {
      tx,
      db_client,
      device_info,
      amqp_client,
      notif_client,
    })
  }

  pub async fn reset_failed_amqp(&mut self) -> Result<(), SessionError> {
    self.amqp_client.reset_failed_amqp().await
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
  ) -> Option<String> {
    let serialized_message = match serde_json::from_str::<
      DeviceToTunnelbrokerMessage,
    >(&msg)
    {
      Ok(message) => message,
      Err(_) => {
        error!("Error parsing {}", msg);
        let request_status = DeviceToTunnelbrokerRequestStatus {
          // Information to the client about which message failed to be serialized.
          client_message_ids: vec![MessageSentStatus::SerializationError(msg)],
        };
        return serde_json::to_string(&request_status).ok();
      }
    };

    let message_status =
      self.handle_message_from_device(serialized_message).await?;

    let request_status = DeviceToTunnelbrokerRequestStatus {
      client_message_ids: vec![message_status],
    };
    serde_json::to_string(&request_status).ok()
  }

  pub async fn handle_message_from_device(
    &mut self,
    device_to_tunnelbroker_message: DeviceToTunnelbrokerMessage,
  ) -> Option<MessageSentStatus> {
    match device_to_tunnelbroker_message {
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

        let result = self
          .amqp_client
          .handle_message_to_device(&message_request)
          .await;
        Some(MessageSentStatus::from_result(
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
        Some(MessageSentStatus::from_result(
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
            return Some(MessageSentStatus::from_result(
              &notif.client_message_id,
              Err(e),
            ));
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
            if body.reason.should_invalidate_token() {
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
          return Some(MessageSentStatus::from_result(
            &notif.client_message_id,
            response,
          ));
        }

        Some(MessageSentStatus::from_result(
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
            return Some(MessageSentStatus::from_result(
              &notif.client_message_id,
              Err(e),
            ))
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
          return Some(MessageSentStatus::from_result(
            &notif.client_message_id,
            result,
          ));
        }

        Some(MessageSentStatus::from_result(
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
          return Some(MessageSentStatus::from_result(
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
            return Some(MessageSentStatus::from_result(
              &notif.client_message_id,
              Err(e),
            ))
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
            WebPushError::EndpointNotValid(_)
              | WebPushError::EndpointNotFound(_)
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
          } else {
            error!(
              errorType = error_types::WEB_PUSH_ERROR,
              "Failed sending Web Push notification to: {}. Error: {}",
              device_token,
              web_push_error
            );
          }
        }
        Some(MessageSentStatus::from_result(
          &notif.client_message_id,
          result,
        ))
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
          return Some(MessageSentStatus::from_result(
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
            return Some(MessageSentStatus::from_result(
              &notif.client_message_id,
              Err(e),
            ))
          }
        };

        let wns_notif = WNSNotif {
          device_token: device_token.clone(),
          payload: notif.payload,
        };

        let result = wns_client.send(wns_notif).await;
        if let Err(NotifsWNSError(err)) = &result {
          if err.should_invalidate_token() {
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
        Some(MessageSentStatus::from_result(
          &notif.client_message_id,
          result,
        ))
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
    self.amqp_client.next_amqp_message().await
  }

  pub async fn send_message_to_device(&mut self, message: Message) {
    if let Err(e) = self.tx.send(message).await {
      if should_ignore_error(&e) {
        debug!("Ignored error when sending message to device: {e:?}");
        return;
      }
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

    self.amqp_client.close_connection().await;
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

    self
      .amqp_client
      .handle_message_to_device(&message_request)
      .await?;

    self
      .db_client
      .mark_device_token_as_invalid(&device_id)
      .await
      .map_err(SessionError::DatabaseError)?;

    Ok(())
  }
}

fn should_ignore_error(err: &hyper_tungstenite::tungstenite::Error) -> bool {
  use hyper_tungstenite::tungstenite::Error as E;
  use std::io::ErrorKind;

  match err {
    E::ConnectionClosed | E::AlreadyClosed => true,
    E::Io(io_error) => match io_error.kind() {
      // The operation failed because a pipe was closed.
      ErrorKind::BrokenPipe => true,
      _ => false,
    },
    _ => false,
  }
}
