use chrono::{DateTime, Utc};

pub enum AuthType {
  Password,
  Wallet,
}

pub struct AccessToken {
  pub user_id: String,
  pub device_id: String,
  pub token: String,
  pub created: DateTime<Utc>,
  pub auth_type: AuthType,
  pub valid: bool,
}
