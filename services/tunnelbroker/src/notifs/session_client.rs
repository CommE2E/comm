use crate::amqp_client::AmqpClient;
use crate::constants::error_types;
use crate::database::DatabaseClient;
use crate::notifs::apns::headers::NotificationHeaders;
use crate::notifs::apns::APNsNotif;
use crate::notifs::fcm::firebase_message::{
  AndroidConfig, AndroidMessagePriority, FCMMessage,
};
use crate::notifs::web_push::WebPushNotif;
use crate::notifs::wns::WNSNotif;
use crate::websockets::session::SessionError;
use tracing::{debug, error};
use tunnelbroker_messages::bad_device_token::BadDeviceToken;
use tunnelbroker_messages::MessageToDeviceRequest;
use tunnelbroker_messages::{MessageSentStatus, Platform};

use super::base::BaseNotifClient;
use super::{NotifClientError, NotifType};

impl NotifType {
  pub fn supported_platform(&self, platform: Platform) -> bool {
    match self {
      NotifType::APNs => {
        platform == Platform::IOS || platform == Platform::MacOS
      }
      NotifType::FCM => platform == Platform::Android,
      NotifType::WebPush => platform == Platform::Web,
      NotifType::WNS => platform == Platform::Windows,
    }
  }
}

/// Notification client isntance intended to be used in
/// websocket sessions with client devices.
#[derive(Clone)]
pub struct SessionNotifClient {
  inner: BaseNotifClient,
  db_client: DatabaseClient,
}

impl SessionNotifClient {
  pub fn new(db_client: DatabaseClient) -> SessionNotifClient {
    SessionNotifClient {
      inner: BaseNotifClient::new(),
      db_client,
    }
  }

  async fn invalidate_device_token(
    &self,
    device_id: String,
    invalidated_token: String,
    amqp_client: &mut AmqpClient,
  ) -> Result<(), SessionError> {
    let bad_device_token_message = BadDeviceToken { invalidated_token };
    let payload = serde_json::to_string(&bad_device_token_message)?;
    let message_request = MessageToDeviceRequest {
      client_message_id: uuid::Uuid::new_v4().to_string(),
      device_id: device_id.to_string(),
      payload,
    };

    amqp_client
      .handle_message_to_device(&message_request)
      .await?;

    self
      .db_client
      .mark_device_token_as_invalid(&device_id)
      .await
      .map_err(SessionError::DatabaseError)?;

    Ok(())
  }

  async fn get_device_token(
    &self,
    device_id: String,
    client: NotifType,
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

  async fn handle_invalid_token<T>(
    &self,
    result: &Result<T, NotifClientError>,
    amqp_client: &mut AmqpClient,
    device_id: String,
    device_token: String,
  ) {
    let Err(e) = &result else {
      return;
    };

    if !e.should_invalidate_token() {
      return;
    }

    if let Err(e) = self
      .invalidate_device_token(device_id, device_token.clone(), amqp_client)
      .await
    {
      error!(
        errorType = error_types::DDB_ERROR,
        "Error invalidating device token {}: {:?}", device_token, e
      );
    };
  }

  pub async fn send_apns_notif(
    &self,
    notif: tunnelbroker_messages::notif::APNsNotif,
    amqp_client: &mut AmqpClient,
  ) -> Option<MessageSentStatus> {
    debug!("Received APNs notif for {}", notif.device_id);

    let Ok(headers) =
      serde_json::from_str::<NotificationHeaders>(&notif.headers)
    else {
      return Some(MessageSentStatus::SerializationError(notif.headers));
    };

    let device_token = match self
      .get_device_token(notif.device_id.clone(), NotifType::APNs)
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

    let result = self.inner.send_notif(apns_notif.into()).await;
    self
      .handle_invalid_token(&result, amqp_client, notif.device_id, device_token)
      .await;

    Self::return_notif_sent_status(&notif.client_message_id, result)
  }

  pub async fn send_fcm_notif(
    &self,
    notif: tunnelbroker_messages::notif::FCMNotif,
    amqp_client: &mut AmqpClient,
  ) -> Option<MessageSentStatus> {
    debug!("Received FCM notif for {}", notif.device_id);

    let Some(priority) = AndroidMessagePriority::from_raw(&notif.priority)
    else {
      return Some(MessageSentStatus::SerializationError(notif.priority));
    };

    let Ok(data) = serde_json::from_str(&notif.data) else {
      return Some(MessageSentStatus::SerializationError(notif.data));
    };

    let device_token = match self
      .get_device_token(notif.device_id.clone(), NotifType::FCM)
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

    let result = self.inner.send_notif(fcm_message.into()).await;
    self
      .handle_invalid_token(&result, amqp_client, notif.device_id, device_token)
      .await;

    Self::return_notif_sent_status(&notif.client_message_id, result)
  }

  pub async fn send_web_notif(
    &self,
    notif: tunnelbroker_messages::notif::WebPushNotif,
    amqp_client: &mut AmqpClient,
  ) -> Option<MessageSentStatus> {
    debug!("Received WebPush notif for {}", notif.device_id);

    let device_token = match self
      .get_device_token(notif.device_id.clone(), NotifType::WebPush)
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

    let result = self.inner.send_notif(web_push_notif.into()).await;
    self
      .handle_invalid_token(&result, amqp_client, notif.device_id, device_token)
      .await;

    Self::return_notif_sent_status(&notif.client_message_id, result)
  }

  pub async fn send_wns_notif(
    &self,
    notif: tunnelbroker_messages::notif::WNSNotif,
    amqp_client: &mut AmqpClient,
  ) -> Option<MessageSentStatus> {
    debug!("Received WNS notif for {}", notif.device_id);

    let device_token = match self
      .get_device_token(notif.device_id.clone(), NotifType::WNS)
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

    let result = self.inner.send_notif(wns_notif.into()).await;
    self
      .handle_invalid_token(&result, amqp_client, notif.device_id, device_token)
      .await;

    Self::return_notif_sent_status(&notif.client_message_id, result)
  }

  fn return_notif_sent_status(
    client_message_id: &str,
    result: Result<(), NotifClientError>,
  ) -> Option<MessageSentStatus> {
    let Err(NotifClientError::MissingClient(client_type)) = &result else {
      return Some(MessageSentStatus::from_result(client_message_id, result));
    };

    let session_error = match client_type {
      NotifType::APNs => SessionError::MissingAPNsClient,
      NotifType::FCM => SessionError::MissingFCMClient,
      NotifType::WebPush => SessionError::MissingWebPushClient,
      NotifType::WNS => SessionError::MissingWNSClient,
    };

    Some(MessageSentStatus::from_result(
      client_message_id,
      Err(session_error),
    ))
  }
}
