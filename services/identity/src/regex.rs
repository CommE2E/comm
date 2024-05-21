use regex::Regex;

use crate::constants::VALID_USERNAME_REGEX_STRING;

pub fn is_valid_username(candidate: &str) -> bool {
  let valid_username_regex = Regex::new(VALID_USERNAME_REGEX_STRING)
    .expect("regex pattern should be valid");
  valid_username_regex.is_match(candidate)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_valid_username_with_dash_and_underscore() {
    assert!(is_valid_username("WRx16rC_VWX-"),);
  }

  #[test]
  fn test_valid_username_with_minimum_length() {
    assert!(is_valid_username("a"));
  }

  #[test]
  fn test_valid_username_with_maximum_length() {
    assert!(is_valid_username(
      "Dg75raz1KL0rzqFbnUDAtSp0KfvDThPGcYGHiEin9m7LCWYJ7vQYNkXpbTNJ7MYaaTeqApgYDr3XdNX0BmKetP0iJeKRZuDdSEuybnGrdivwSQPLrJ8rv2WMTGvNjjDypvMMbDXmQ7wt0jPFfKD41Uc07SkPFcBJkwBJ8WJuJWmm7m0nvxhFRieQn319qHk"
    ));
  }

  #[allow(clippy::bool_assert_comparison)]
  #[test]
  fn test_invalid_username_too_short() {
    assert_eq!(is_valid_username(""), false);
  }

  #[allow(clippy::bool_assert_comparison)]
  #[test]
  fn test_invalid_username_too_long() {
    assert_eq!(
      is_valid_username("XVnYhmjPrVpSwLZnSGjdnx5mmRFLbSh5RjjqU7Wf62LXe9Hyy0CfJQNXgTy62Uxzip538MMYtwvaqqA0fukYijWAuZdVVpYRMuaZ0gzxLgV6hzF9amvnjZGYgdKeEX45WErYq2nN7Q2ivcFfftWnpudPcPr0pxWRLdmqS37jNVHWMX919vXz0PdzeLNHx0TW"),
      false
    );
  }

  #[allow(clippy::bool_assert_comparison)]
  #[test]
  fn test_invalid_username_first_char_non_alphanumeric() {
    assert_eq!(is_valid_username("-asdf"), false);
  }

  #[allow(clippy::bool_assert_comparison)]
  #[test]
  fn test_invalid_username_invalid_symbol() {
    assert_eq!(is_valid_username("asdf$"), false);
  }
}
