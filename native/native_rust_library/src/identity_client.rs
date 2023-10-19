use tonic::Status;

use crate::IdentityClient;

// User could be logging in from new device, need to resend device information
pub async fn login_user_pake(
  mut _client: Box<IdentityClient>,
  _username: String,
  _password: String,
  _key_payload: String,
  _key_payload_signature: String,
  _identity_prekey: String,
  _identity_prekey_signature: String,
  _notif_prekey: String,
  _notif_prekey_signature: String,
  _identity_one_time_keys: Vec<String>,
  _notif_one_time_keys: Vec<String>,
) -> Result<String, Status> {
  unimplemented!();
}

pub async fn login_user_wallet(
  mut _client: Box<IdentityClient>,
  _siwe_message: String,
  _siwe_signature: String,
  _key_payload: String,
  _key_payload_signature: String,
  _identity_prekey: String,
  _identity_prekey_signature: String,
  _notif_prekey: String,
  _notif_prekey_signature: String,
  _identity_one_time_keys: Vec<String>,
  _notif_one_time_keys: Vec<String>,
) -> Result<String, Status> {
  unimplemented!();
}
