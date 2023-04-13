#[derive(Default, Clone)]
pub struct Config {
  pub fcm_api_key: String,
  pub apns_certificate_path: String,
  pub apns_certificate_password: String,
  pub apns_topic: String,
  pub is_sandbox: bool,
}
