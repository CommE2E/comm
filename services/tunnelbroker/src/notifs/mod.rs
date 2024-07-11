use crate::notifs::apns::APNsClient;
use crate::notifs::fcm::FCMClient;

pub mod apns;
pub mod fcm;

#[derive(Clone)]
pub struct NotifClient {
  pub(crate) apns: Option<APNsClient>,
  pub(crate) fcm: Option<FCMClient>,
}
