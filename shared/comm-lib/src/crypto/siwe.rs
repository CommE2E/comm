use regex::Regex;

pub fn is_valid_ethereum_address(candidate: &str) -> bool {
  let ethereum_address_regex = Regex::new(r"^0x[a-fA-F0-9]{40}$").unwrap();
  ethereum_address_regex.is_match(candidate)
}

#[cfg(test)]
mod tests {

  use super::*;

  #[test]
  fn test_valid_ethereum_address() {
    assert!(is_valid_ethereum_address(
      "0x1234567890123456789012345678901234567890"
    ),);
    assert!(is_valid_ethereum_address(
      "0xABCDEF123456789012345678901234567890ABCD"
    ));
    assert!(is_valid_ethereum_address(
      "0xabcdef123456789012345678901234567890abcd"
    ));
  }

  #[allow(clippy::bool_assert_comparison)]
  #[test]
  fn test_invalid_ethereum_address() {
    // Shorter than 42 characters
    assert_eq!(
      is_valid_ethereum_address("0x12345678901234567890123456789012345678"),
      false
    );
    // Longer than 42 characters
    assert_eq!(
      is_valid_ethereum_address("0x123456789012345678901234567890123456789012"),
      false
    );
    // Missing 0x prefix
    assert_eq!(
      is_valid_ethereum_address("1234567890123456789012345678901234567890"),
      false
    );
    // Contains invalid characters
    assert_eq!(
      is_valid_ethereum_address("0x1234567890GHIJKL9012345678901234567890"),
      false
    );
    // Empty string
    assert_eq!(is_valid_ethereum_address(""), false);
  }
}
