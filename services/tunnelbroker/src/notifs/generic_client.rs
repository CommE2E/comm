use grpc_clients::identity::protos::unauth::DeviceType as ProtoDeviceType;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::amqp_client::utils::{BasicMessageSender, SendMessageError};
use crate::constants::error_types;
use crate::database::DatabaseClient;
use crate::notifs::Notif;

use super::apns::APNsNotif;
use super::base::BaseNotifClient;
use super::fcm::firebase_message::FCMMessage;
use super::web_push::WebPushNotif;
use super::wns::WNSNotif;
use super::NotifType;

#[derive(
  Serialize, Deserialize, PartialEq, Debug, Clone, derive_more::Display,
)]
#[serde(rename_all = "lowercase")]
pub enum NotifPlatform {
  #[display = "android"]
  Android,
  #[display = "ios"]
  Ios,
  #[display = "web"]
  Web,
  #[display = "windows"]
  Windows,
  #[display = "macos"]
  MacOS,
}

impl TryFrom<ProtoDeviceType> for NotifPlatform {
  type Error = GenericNotifClientError;

  fn try_from(value: ProtoDeviceType) -> Result<Self, Self::Error> {
    match value {
      ProtoDeviceType::Web => Ok(Self::Web),
      ProtoDeviceType::Ios => Ok(Self::Ios),
      ProtoDeviceType::Android => Ok(Self::Android),
      ProtoDeviceType::Windows => Ok(Self::Windows),
      ProtoDeviceType::MacOs => Ok(Self::MacOS),
      ProtoDeviceType::Keyserver => {
        Err(GenericNotifClientError::UnsupportedPlatform)
      }
    }
  }
}

impl NotifType {
  fn for_platform(platform: &NotifPlatform) -> Self {
    match platform {
      NotifPlatform::Ios | NotifPlatform::MacOS => Self::APNs,
      NotifPlatform::Android => Self::FCM,
      NotifPlatform::Web => Self::WebPush,
      NotifPlatform::Windows => Self::WNS,
    }
  }
}

pub struct NotifRecipientDescriptor {
  pub device_id: String,
  pub platform: NotifPlatform,
}

#[derive(Clone, Debug, Serialize)]
pub struct GenericNotifPayload {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub title: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub body: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub thread_id: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub badge: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub badge_only: Option<bool>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub farcaster_badge: Option<bool>,
}

enum APNsTopic {
  Ios,
  MacOS,
}

impl APNsTopic {
  fn as_str(&self) -> &str {
    match self {
      APNsTopic::Ios => "app.comm",
      APNsTopic::MacOS => "app.comm.macos",
    }
  }
}

#[derive(
  Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum DeviceTokenError {
  DatabaseError(Box<comm_lib::database::Error>),
  MissingDeviceToken,
  InvalidDeviceToken,
  InvalidNotifProvider,
}

#[derive(
  Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum GenericNotifClientError {
  Provider(super::base::NotifClientError),
  TokenError(DeviceTokenError),
  CommunicationError(SendMessageError),
  SerializationError(serde_json::Error),
  #[display = "Target device doesn't support notifs"]
  UnsupportedPlatform,
}

impl GenericNotifClientError {
  /// True if error is caused by missing or expired device token.
  pub fn is_invalid_token(&self) -> bool {
    use DeviceTokenError::{InvalidDeviceToken, MissingDeviceToken};
    match self {
      Self::Provider(e) if e.should_invalidate_token() => true,
      Self::TokenError(err) => {
        matches!(err, MissingDeviceToken | InvalidDeviceToken)
      }
      _ => false,
    }
  }
}

impl GenericNotifPayload {
  fn into_apns(self, device_token: &str, topic: APNsTopic) -> APNsNotif {
    use super::apns::headers::NotificationHeaders;
    use super::apns::headers::PushType;

    let headers = NotificationHeaders {
      apns_topic: Some(topic.as_str().into()),
      apns_push_type: Some(PushType::Alert),
      apns_id: Some(uuid::Uuid::new_v4().to_string()),
      apns_expiration: None,
      apns_priority: None,
      apns_collapse_id: None,
    };

    let mut payload_obj = json!({
      "aps": {
        "mutable-content": 1
      },
    });

    // Only add alert if we have title or body
    if self.title.is_some() || self.body.is_some() {
      payload_obj["aps"]["alert"] = json!({
        "title": self.title.unwrap_or_default(),
        "body": self.body.unwrap_or_default(),
      });
      payload_obj["aps"]["sound"] = json!("default");
    }

    if let Some(thread_id) = self.thread_id {
      payload_obj["aps"]["thread-id"] = json!(thread_id);
    }
    if let Some(badge) = self.badge {
      payload_obj["badge"] = json!(badge);
    }
    if let Some(badge_only) = self.badge_only {
      payload_obj["badgeOnly"] = json!(if badge_only { "1" } else { "0" });
    }
    if let Some(farcaster_badge) = self.farcaster_badge {
      payload_obj["farcasterBadge"] =
        json!(if farcaster_badge { "1" } else { "0" });
    }

    APNsNotif {
      device_token: device_token.to_string(),
      headers,
      payload: serde_json::to_string(&payload_obj).unwrap(),
    }
  }

  fn into_fcm(self, device_token: &str) -> FCMMessage {
    use super::fcm::firebase_message::{AndroidConfig, AndroidMessagePriority};

    let mut data = json!({
      "id": uuid::Uuid::new_v4().to_string(),
      "badgeOnly": if self.badge_only.unwrap_or(false) { "1" } else { "0" },
    });

    if let Some(title) = self.title {
      data["title"] = json!(title);
    }
    if let Some(body) = self.body {
      data["body"] = json!(body);
    }
    if let Some(thread_id) = self.thread_id {
      data["threadID"] = json!(thread_id);
    }
    if let Some(badge) = self.badge {
      data["badge"] = json!(badge);
    }
    if let Some(farcaster_badge) = self.farcaster_badge {
      data["farcasterBadge"] = json!(if farcaster_badge { "1" } else { "0" });
    }

    FCMMessage {
      data,
      token: device_token.to_string(),
      android: AndroidConfig {
        priority: AndroidMessagePriority::Normal,
      },
    }
  }

  fn into_web_push(self, device_token: &str) -> WebPushNotif {
    use crate::notifs::web_push::WebPushNotif;

    let mut payload = json!({
      "id": uuid::Uuid::new_v4().to_string(),
    });

    if let Some(title) = self.title {
      payload["title"] = json!(title);
    }
    if let Some(body) = self.body {
      payload["body"] = json!(body);
    }
    if let Some(thread_id) = self.thread_id {
      payload["threadID"] = json!(thread_id);
    }
    if let Some(badge) = self.badge {
      payload["badge"] = json!(badge);
    }
    if let Some(badge_only) = self.badge_only {
      payload["badgeOnly"] = json!(if badge_only { "1" } else { "0" });
    }
    if let Some(farcaster_badge) = self.farcaster_badge {
      payload["farcasterBadge"] =
        json!(if farcaster_badge { "1" } else { "0" });
    }

    WebPushNotif {
      device_token: device_token.to_string(),
      payload: serde_json::to_string(&payload).unwrap(),
    }
  }

  fn into_wns(self, device_token: &str) -> WNSNotif {
    let mut payload = json!({});

    if let Some(title) = self.title {
      payload["title"] = json!(title);
    }
    if let Some(body) = self.body {
      payload["body"] = json!(body);
    }
    if let Some(thread_id) = self.thread_id {
      payload["threadID"] = json!(thread_id);
    }
    if let Some(badge) = self.badge {
      payload["badge"] = json!(badge);
    }
    if let Some(badge_only) = self.badge_only {
      payload["badgeOnly"] = json!(if badge_only { "1" } else { "0" });
    }
    if let Some(farcaster_badge) = self.farcaster_badge {
      payload["farcasterBadge"] =
        json!(if farcaster_badge { "1" } else { "0" });
    }

    WNSNotif {
      device_token: device_token.to_string(),
      payload: serde_json::to_string(&payload).unwrap(),
    }
  }
}

#[derive(Clone)]
pub struct GenericNotifClient {
  inner: BaseNotifClient,
  db_client: DatabaseClient,
  message_sender: BasicMessageSender,
}

impl GenericNotifClient {
  pub fn new(
    db_client: DatabaseClient,
    message_sender: BasicMessageSender,
  ) -> Self {
    Self {
      inner: BaseNotifClient::new(),
      db_client,
      message_sender,
    }
  }

  async fn get_device_token(
    &self,
    device_id: String,
    notif_type: NotifType,
  ) -> Result<String, DeviceTokenError> {
    use crate::database::DeviceTokenEntry;

    let db_token = self
      .db_client
      .get_device_token(&device_id)
      .await
      .map_err(|err| DeviceTokenError::DatabaseError(Box::new(err)))?;

    match db_token {
      None => Err(DeviceTokenError::MissingDeviceToken),
      Some(DeviceTokenEntry {
        device_token,
        token_invalid,
        platform,
      }) => {
        if token_invalid {
          return Err(DeviceTokenError::InvalidDeviceToken);
        }

        if platform.is_some_and(|p| !notif_type.supported_platform(p)) {
          return Err(DeviceTokenError::InvalidNotifProvider);
        }

        Ok(device_token)
      }
    }
  }

  async fn invalidate_device_token(
    &self,
    device_id: String,
    invalidated_token: String,
  ) -> Result<(), GenericNotifClientError> {
    use tunnelbroker_messages::bad_device_token::BadDeviceToken;
    use tunnelbroker_messages::MessageToDeviceRequest;

    tracing::debug!(
      "Invalidating notif device token for device: {}",
      device_id
    );

    let message = BadDeviceToken { invalidated_token };
    let message_request = MessageToDeviceRequest {
      device_id: device_id.to_string(),
      payload: serde_json::to_string(&message)?,
      client_message_id: uuid::Uuid::new_v4().to_string(),
    };

    self
      .message_sender
      .send_message_to_device(&message_request)
      .await?;

    self
      .db_client
      .mark_device_token_as_invalid(&device_id)
      .await
      .map_err(|err| DeviceTokenError::DatabaseError(err.into()))?;

    Ok(())
  }

  pub async fn send_notif(
    &self,
    notif: GenericNotifPayload,
    target: NotifRecipientDescriptor,
  ) -> Result<(), GenericNotifClientError> {
    let NotifRecipientDescriptor {
      device_id,
      platform,
    } = target;
    tracing::trace!(device_id, "Sending notif for platform: {platform}");

    let device_token = self
      .get_device_token(device_id.clone(), NotifType::for_platform(&platform))
      .await?;

    let target_notif: Notif = match &platform {
      NotifPlatform::Android => notif.into_fcm(&device_token).into(),
      NotifPlatform::Ios => {
        notif.into_apns(&device_token, APNsTopic::Ios).into()
      }
      NotifPlatform::MacOS => {
        notif.into_apns(&device_token, APNsTopic::MacOS).into()
      }
      NotifPlatform::Web => notif.into_web_push(&device_token).into(),
      NotifPlatform::Windows => notif.into_wns(&device_token).into(),
    };

    let token_error = match self.inner.send_notif(target_notif).await {
      Ok(()) => return Ok(()),
      Err(e) if !e.should_invalidate_token() => {
        tracing::error!(
          "Error when sending notif for platform {}: {:?}",
          platform,
          e
        );
        return Err(e.into());
      }
      Err(token_error) => token_error,
    };

    if let Err(e) = self
      .invalidate_device_token(device_id, device_token.clone())
      .await
    {
      tracing::error!(
        errorType = error_types::DDB_ERROR,
        "Error invalidating device token {}: {:?}",
        device_token,
        e
      );
    };

    Err(token_error.into())
  }
}
