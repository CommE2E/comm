use tonic::Status;

use crate::IdentityClient;

pub async fn register_user(
  mut _client: Box<IdentityClient>,
  _user_id: String,
  _signing_public_key: String,
  _username: String,
  _password: String,
) -> Result<String, Status> {
  unimplemented!();
}

pub async fn login_user_pake(
  mut _client: Box<IdentityClient>,
  _user_id: String,
  _signing_public_key: String,
  _password: String,
) -> Result<String, Status> {
  unimplemented!();
}

pub async fn login_user_wallet(
  mut _client: Box<IdentityClient>,
  _user_id: String,
  _signing_public_key: String,
  _siwe_message: String,
  _siwe_signature: String,
) -> Result<String, Status> {
  unimplemented!();
}
