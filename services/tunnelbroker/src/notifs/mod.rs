use crate::notifs::apns::APNsClient;

pub mod apns;

#[derive(Clone)]
pub struct NotifClient {
  pub(crate) apns: Option<APNsClient>,
}
