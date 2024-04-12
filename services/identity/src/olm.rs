use crate::constants::ONE_TIME_KEY_SIZE;

pub fn is_valid_olm_key(input: &str) -> bool {
  let is_json = input.starts_with('{') && input.ends_with('}');

  let is_correct_length = input.len() == ONE_TIME_KEY_SIZE;

  !is_json && is_correct_length
}
