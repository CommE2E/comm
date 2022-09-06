use anyhow::Result;
use lazy_static::lazy_static;
use tokio::runtime::Runtime;
pub mod apns;
pub mod fcm;

#[cxx::bridge]
mod ffi {
  extern "Rust" {
    #[cxx_name = "sendNotifToAPNS"]
    fn send_notif_to_apns(
      certificate_path: &str,
      certificate_password: &str,
      device_token: &str,
      message: &str,
      sandbox: bool,
    ) -> Result<()>;

    #[cxx_name = "sendNotifToFCM"]
    fn send_notif_to_fcm(
      fcm_api_key: &str,
      device_registration_id: &str,
      message_title: &str,
      message_body: &str,
    ) -> Result<u64>;
  }
}

lazy_static! {
  // Lazy static Tokio runtime initialization
  pub static ref RUNTIME: Runtime = Runtime::new().unwrap();
}

pub fn send_notif_to_apns(
  certificate_path: &str,
  certificate_password: &str,
  device_token: &str,
  message: &str,
  sandbox: bool,
) -> Result<()> {
  RUNTIME.block_on(apns::send_by_a2_client(
    certificate_path,
    certificate_password,
    device_token,
    message,
    sandbox,
  ))
}

pub fn send_notif_to_fcm(
  fcm_api_key: &str,
  device_registration_id: &str,
  message_title: &str,
  message_body: &str,
) -> Result<u64> {
  RUNTIME.block_on(fcm::send_by_fcm_client(
    fcm_api_key,
    device_registration_id,
    message_title,
    message_body,
  ))
}
