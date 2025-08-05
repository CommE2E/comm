use crate::amqp_client::AmqpClient;
use crate::constants::error_types;
use crate::database::DatabaseClient;
use crate::notifs::apns::headers::NotificationHeaders;
use crate::notifs::apns::{APNsClient, APNsNotif};
use crate::notifs::fcm::firebase_message::{
  AndroidConfig, AndroidMessagePriority, FCMMessage,
};
use crate::notifs::fcm::FCMClient;
use crate::notifs::web_push::error::Error::WebPush as NotifsWebPushError;
use crate::notifs::web_push::{WebPushClient, WebPushNotif};
use crate::notifs::wns::error::Error::WNSNotification as NotifsWNSError;
use crate::notifs::wns::{WNSClient, WNSNotif};
use crate::websockets::session::SessionError;
use ::web_push::WebPushError;
use tracing::{debug, error};
use tunnelbroker_messages::bad_device_token::BadDeviceToken;
use tunnelbroker_messages::MessageSentStatus;
use tunnelbroker_messages::{MessageToDeviceRequest, Platform};

pub mod apns;
pub mod fcm;
pub mod web_push;
pub mod wns;

#[derive(PartialEq)]
pub enum NotifClientType {
  APNs,
  FCM,
  WebPush,
  WNS,
}

impl NotifClientType {
  pub fn supported_platform(&self, platform: Platform) -> bool {
    match self {
      NotifClientType::APNs => {
        platform == Platform::IOS || platform == Platform::MacOS
      }
      NotifClientType::FCM => platform == Platform::Android,
      NotifClientType::WebPush => platform == Platform::Web,
      NotifClientType::WNS => platform == Platform::Windows,
    }
  }
}

#[derive(Clone)]
pub struct NotifClient {
  apns: Option<APNsClient>,
  fcm: Option<FCMClient>,
  web_push: Option<WebPushClient>,
  wns: Option<WNSClient>,
  db_client: DatabaseClient,
}

impl NotifClient {
  pub fn new(
    apns: Option<APNsClient>,
    fcm: Option<FCMClient>,
    web_push: Option<WebPushClient>,
    wns: Option<WNSClient>,
    db_client: DatabaseClient,
  ) -> NotifClient {
    NotifClient {
      apns,
      fcm,
      web_push,
      wns,
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

    if let Some(apns) = self.apns.clone() {
      let response = apns.send(apns_notif).await;
      if let Err(apns::error::Error::ResponseError(body)) = &response {
        if body.reason.should_invalidate_token() {
          if let Err(e) = self
            .invalidate_device_token(
              notif.device_id,
              device_token.clone(),
              amqp_client,
            )
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

  pub async fn send_fcm_notif(
    &self,
    notif: tunnelbroker_messages::notif::FCMNotif,
    amqp_client: &mut AmqpClient,
  ) -> Option<MessageSentStatus> {
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

    if let Some(fcm) = self.fcm.clone() {
      let result = fcm.send(fcm_message).await;

      if let Err(crate::notifs::fcm::error::Error::FCMError(fcm_error)) =
        &result
      {
        if fcm_error.should_invalidate_token() {
          if let Err(e) = self
            .invalidate_device_token(
              notif.device_id,
              device_token.clone(),
              amqp_client,
            )
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

  pub async fn send_web_notif(
    &self,
    notif: tunnelbroker_messages::notif::WebPushNotif,
    amqp_client: &mut AmqpClient,
  ) -> Option<MessageSentStatus> {
    debug!("Received WebPush notif for {}", notif.device_id);

    let Some(web_push_client) = self.web_push.clone() else {
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
        WebPushError::EndpointNotValid(_) | WebPushError::EndpointNotFound(_)
      ) {
        if let Err(e) = self
          .invalidate_device_token(
            notif.device_id,
            device_token.clone(),
            amqp_client,
          )
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

  pub async fn send_wns_notif(
    &self,
    notif: tunnelbroker_messages::notif::WNSNotif,
    amqp_client: &mut AmqpClient,
  ) -> Option<MessageSentStatus> {
    debug!("Received WNS notif for {}", notif.device_id);

    let Some(wns_client) = self.wns.clone() else {
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
          .invalidate_device_token(
            notif.device_id,
            device_token.clone(),
            amqp_client,
          )
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
}
