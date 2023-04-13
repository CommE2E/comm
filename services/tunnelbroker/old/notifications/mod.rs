pub mod apns;
pub mod config;
pub mod fcm;
use super::cxx_bridge::ffi::{getConfigParameter, isSandbox};
use lazy_static::lazy_static;

lazy_static! {
  static ref CONFIG: config::Config = config::Config {
    fcm_api_key: getConfigParameter("notifications.fcm_server_key")
      .expect("Error getting `notifications.fcm_server_key` config parameter"),
    apns_certificate_path: getConfigParameter("notifications.apns_cert_path")
      .expect("Error getting `notifications.apns_cert_path` config parameter"),
    apns_certificate_password: getConfigParameter(
      "notifications.apns_cert_password"
    )
    .expect(
      "Error getting `notifications.apns_cert_password` config parameter"
    ),
    apns_topic: getConfigParameter("notifications.apns_topic")
      .expect("Error getting `apns_topic` config parameter"),
    is_sandbox: isSandbox().expect("Error determining of sandboxing"),
  };
}
