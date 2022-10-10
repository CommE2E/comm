use crate::ffi::{apns_status, fcm_status};
use anyhow::Result;
use env_logger;
use lazy_static::lazy_static;
use log::info;
use std::sync::RwLock;
use tokio::runtime::Runtime;
pub mod notifications;

#[cxx::bridge]
mod ffi {
  #[namespace = "rust::notifications"]
  #[cxx_name = "apnsReturnStatus"]
  enum apns_status {
    Ok,
    Unregistered,
    BadDeviceToken,
  }
  #[namespace = "rust::notifications"]
  #[cxx_name = "fcmReturnStatus"]
  enum fcm_status {
    Ok,
    InvalidRegistration,
    NotRegistered,
  }
  #[namespace = "rust::notifications"]
  extern "Rust" {
    #[cxx_name = "init"]
    fn notifications_init(
      fcm_api_key: &str,
      apns_certificate_path: &str,
      apns_certificate_password: &str,
      apns_topic: &str,
      is_sandbox: bool,
    ) -> Result<()>;
    #[cxx_name = "sendNotifToAPNS"]
    fn send_notif_to_apns(
      certificate_path: &str,
      certificate_password: &str,
      device_token: &str,
      topic: &str,
      message: &str,
      sandbox: bool,
    ) -> Result<apns_status>;

    #[cxx_name = "sendNotifToFCM"]
    fn send_notif_to_fcm(
      fcm_api_key: &str,
      device_registration_id: &str,
      message_title: &str,
      message_body: &str,
    ) -> Result<fcm_status>;
  }
}

lazy_static! {
  pub static ref RUNTIME: Runtime = {
    env_logger::init();
    info!("Tokio runtime initialization");
    Runtime::new().unwrap()
  };
  static ref NOTIFICATIONS_CONFIG: RwLock<notifications::config::Config> =
    RwLock::new(notifications::config::Config::default());
}

pub fn notifications_init(
  fcm_api_key: &str,
  apns_certificate_path: &str,
  apns_certificate_password: &str,
  apns_topic: &str,
  is_sandbox: bool,
) -> Result<()> {
  let mut config = NOTIFICATIONS_CONFIG
    .write()
    .expect("Unable to write notification config");
  config.fcm_api_key = String::from(fcm_api_key);
  config.apns_certificate_path = String::from(apns_certificate_path);
  config.apns_certificate_password = String::from(apns_certificate_password);
  config.apns_topic = String::from(apns_topic);
  config.is_sandbox = is_sandbox;
  Ok(())
}

pub fn send_notif_to_apns(
  certificate_path: &str,
  certificate_password: &str,
  device_token: &str,
  topic: &str,
  message: &str,
  sandbox: bool,
) -> Result<apns_status> {
  RUNTIME.block_on(notifications::apns::send_by_a2_client(
    certificate_path,
    certificate_password,
    device_token,
    topic,
    message,
    sandbox,
  ))
}

pub fn send_notif_to_fcm(
  fcm_api_key: &str,
  device_registration_id: &str,
  message_title: &str,
  message_body: &str,
) -> Result<fcm_status> {
  RUNTIME.block_on(notifications::fcm::send_by_fcm_client(
    fcm_api_key,
    device_registration_id,
    message_title,
    message_body,
  ))
}
