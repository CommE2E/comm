use crate::notifs::apns::APNsClient;
use crate::notifs::fcm::FCMClient;
use crate::notifs::web_push::WebPushClient;
use tunnelbroker_messages::Platform;

pub mod apns;
pub mod fcm;
pub mod web_push;

#[derive(PartialEq)]
pub enum NotifClientType {
  APNs,
  FCM,
  WebPush,
  WNs,
}

impl NotifClientType {
  pub fn supported_platform(&self, platform: Platform) -> bool {
    match self {
      NotifClientType::APNs => {
        platform == Platform::IOS || platform == Platform::MacOS
      }
      NotifClientType::FCM => platform == Platform::Android,
      NotifClientType::WebPush => platform == Platform::Web,
      NotifClientType::WNs => platform == Platform::Windows,
    }
  }
}

#[derive(Clone)]
pub struct NotifClient {
  pub(crate) apns: Option<APNsClient>,
  pub(crate) fcm: Option<FCMClient>,
  pub(crate) web_push: Option<WebPushClient>,
}
