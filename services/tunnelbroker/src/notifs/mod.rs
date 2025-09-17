pub mod apns;
pub mod fcm;
pub mod web_push;
pub mod wns;

mod base;
mod session_client;

pub use base::{Notif, NotifClientError};
pub use session_client::SessionNotifClient;

#[derive(Debug, derive_more::Display, PartialEq)]
pub enum NotifType {
  APNs,
  FCM,
  WebPush,
  WNS,
}
