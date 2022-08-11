use anyhow::Result;
use lazy_static::lazy_static;
use tokio::runtime::Runtime;
pub mod apns;

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
    ) -> Result<u16>;
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
) -> Result<u16> {
  RUNTIME.block_on(apns::send_by_a2_client(
    certificate_path,
    certificate_password,
    device_token,
    message,
    sandbox,
  ))
}
