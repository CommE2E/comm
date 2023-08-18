use argon2::{Algorithm, Argon2, Params, Version};

pub const BACKUP_KEY_LENGTH: usize = 32; //256-bit digest

pub fn compute_backup_key(
  password: &str,
  backup_id: &str,
) -> Result<[u8; BACKUP_KEY_LENGTH], argon2::Error> {
  let mut backup_key = [0u8; BACKUP_KEY_LENGTH];
  let argon_params = Params::new(
    Params::DEFAULT_M_COST,
    Params::DEFAULT_T_COST,
    Params::DEFAULT_P_COST,
    Some(BACKUP_KEY_LENGTH),
  )?;

  Argon2::new(Algorithm::Argon2i, Version::V0x13, argon_params)
    .hash_password_into(
      password.as_bytes(),
      backup_id.as_bytes(),
      &mut backup_key,
    )?;

  Ok(backup_key)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_compute_backup_key() {
    let password = "password123";
    let backup_id = "backup_123";

    let result = compute_backup_key(password, backup_id);
    assert!(result.is_ok());

    let key = result.unwrap();
    assert_eq!(key.len(), BACKUP_KEY_LENGTH);
  }

  #[test]
  fn test_compute_backup_key_error() {
    let password = "password123";
    let backup_id = "";

    let result = compute_backup_key(password, backup_id);
    assert!(result.is_err());
  }

  #[test]
  fn test_compute_backup_key_accuracy() {
    let password = "password123";
    let backup_id = "backup_123";

    let result1 = compute_backup_key(password, backup_id);
    let result2 = compute_backup_key(password, backup_id);
    assert!(result1.is_ok());
    assert!(result2.is_ok());
    let key1 = result1.unwrap();
    let key2 = result2.unwrap();
    assert_eq!(key1, key2);
  }
}
