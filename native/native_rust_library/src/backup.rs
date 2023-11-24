use crate::argon2_tools::compute_backup_key;
use crate::constants::aes;
use crate::handle_string_result_as_callback;
use crate::RUNTIME;
use base64::{prelude::BASE64_STANDARD, Engine};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::error::Error;
pub mod ffi {
  use super::*;

  pub fn create_backup_sync(
    backup_id: String,
    backup_secret: String,
    pickle_key: String,
    pickled_account: String,
    user_data: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let result = create_backup(
        backup_id,
        backup_secret,
        pickle_key,
        pickled_account,
        user_data,
      );
      handle_string_result_as_callback(result, promise_id);
    });
  }

  pub fn restore_backup_sync(
    backup_id: String,
    backup_secret: String,
    encrypted_user_keys: String,
    encrypted_user_data: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let result = restore_backup(
        backup_id,
        backup_secret,
        encrypted_user_keys,
        encrypted_user_data,
      );
      handle_string_result_as_callback(result, promise_id);
    });
  }
}

pub fn create_backup(
  backup_id: String,
  backup_secret: String,
  pickle_key: String,
  pickled_account: String,
  user_data: String,
) -> Result<String, Box<dyn Error>> {
  let mut backup_key =
    compute_backup_key(backup_secret.as_bytes(), backup_id.as_bytes())?;

  let mut user_data = user_data.into_bytes();

  let mut backup_data_key = [0; aes::KEY_SIZE];
  crate::ffi::generate_key(&mut backup_data_key)?;
  let encrypted_user_data = encrypt(&mut backup_data_key, &mut user_data)?;

  let user_keys = UserKeys {
    backup_data_key,
    pickle_key,
    pickled_account,
  };
  let encrypted_user_keys = user_keys.encrypt(&mut backup_key)?;

  Ok(
    json!({
      "backup_id": backup_id,
      "encrypted_user_keys": BASE64_STANDARD.encode(encrypted_user_keys),
      "encrypted_user_data": BASE64_STANDARD.encode(encrypted_user_data),
    })
    .to_string(),
  )
}

pub fn restore_backup(
  backup_id: String,
  backup_secret: String,
  encrypted_user_keys: String,
  encrypted_user_data: String,
) -> Result<String, Box<dyn Error>> {
  let mut encrypted_user_keys: Vec<u8> =
    BASE64_STANDARD.decode(&encrypted_user_keys)?;
  let mut encrypted_user_data: Vec<u8> =
    BASE64_STANDARD.decode(&encrypted_user_data)?;

  let mut backup_id = backup_id.into_bytes();

  let mut backup_key =
    compute_backup_key(backup_secret.as_bytes(), &mut backup_id)?;

  let mut user_keys =
    UserKeys::from_encrypted(&mut encrypted_user_keys, &mut backup_key)?;

  let user_data =
    decrypt(&mut user_keys.backup_data_key, &mut encrypted_user_data)?;

  Ok(BASE64_STANDARD.encode(user_data))
}

#[derive(Debug, Serialize, Deserialize)]
struct UserKeys {
  backup_data_key: [u8; 32],
  pickle_key: String,
  pickled_account: String,
}

impl UserKeys {
  fn encrypt(&self, backup_key: &mut [u8]) -> Result<Vec<u8>, Box<dyn Error>> {
    let mut json = serde_json::to_vec(self)?;
    encrypt(backup_key, &mut json)
  }

  fn from_encrypted(
    data: &mut [u8],
    backup_key: &mut [u8],
  ) -> Result<Self, Box<dyn Error>> {
    let decrypted = decrypt(backup_key, data)?;
    Ok(serde_json::from_slice(&decrypted)?)
  }
}

fn encrypt(key: &mut [u8], data: &mut [u8]) -> Result<Vec<u8>, Box<dyn Error>> {
  let encrypted_len = data.len() + aes::IV_LENGTH + aes::TAG_LENGTH;
  let mut encrypted = vec![0; encrypted_len];

  crate::ffi::encrypt(key, data, &mut encrypted)?;

  Ok(encrypted)
}

fn decrypt(key: &mut [u8], data: &mut [u8]) -> Result<Vec<u8>, Box<dyn Error>> {
  let decrypted_len = data.len() - aes::IV_LENGTH - aes::TAG_LENGTH;
  let mut decrypted = vec![0; decrypted_len];

  crate::ffi::decrypt(key, data, &mut decrypted)?;

  Ok(decrypted)
}
