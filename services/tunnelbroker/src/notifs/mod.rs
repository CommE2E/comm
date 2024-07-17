use crate::notifs::apns::APNsClient;
use crate::notifs::fcm::FCMClient;
use crate::notifs::web_push::WebPushClient;

pub mod apns;
pub mod fcm;
pub mod web_push;

#[derive(Clone)]
pub struct NotifClient {
  pub(crate) apns: Option<APNsClient>,
  pub(crate) fcm: Option<FCMClient>,
  pub(crate) web_push: Option<WebPushClient>,
}
