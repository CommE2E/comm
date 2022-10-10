pub struct Config {
  pub fcm_api_key: String,
  pub apns_certificate_path: String,
  pub apns_certificate_password: String,
  pub apns_topic: String,
  pub sandbox: bool,
}
impl Default for Config {
  fn default() -> Config {
    Config {
      fcm_api_key: String::new(),
      apns_certificate_path: String::new(),
      apns_certificate_password: String::new(),
      apns_topic: String::new(),
      sandbox: false,
    }
  }
}
