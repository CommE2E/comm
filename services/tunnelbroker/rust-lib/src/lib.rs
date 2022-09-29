use crate::ffi::{apns_status, fcm_status};
use anyhow::Result;
use env_logger;
use lazy_static::lazy_static;
use log::info;
use tokio::runtime::Runtime;
pub mod notifications;

#[cxx::bridge]
mod ffi {
  #[cxx_name = "apnsReturnStatus"]
  enum apns_status {
    Ok,
    Unregistered,
    BadDeviceToken,
  }
  #[cxx_name = "fcmReturnStatus"]
  enum fcm_status {
    Ok,
    InvalidRegistration,
    NotRegistered,
  }
  extern "Rust" {
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
