// colon is valid because it is used as a separator
// in some backup service identifiers
const VALID_IDENTIFIER_CHARS: &'static [char] = &['_', '-', '=', ':'];

/// Checks if the given string is a valid identifier for an entity
/// (e.g. backup ID, blob hash, blob holder).
///
/// Some popular identifier formats are considered valid, including UUID,
/// nanoid, base64url. On the other hand, path or url-like identifiers
/// are not supposed to be valid
pub fn is_valid_identifier(identifier: &str) -> bool {
  if identifier.is_empty() {
    return false;
  }

  identifier
    .chars()
    .all(|c| c.is_ascii_alphanumeric() || VALID_IDENTIFIER_CHARS.contains(&c))
}

pub type BoxedError = Box<dyn std::error::Error>;

#[cfg(test)]
mod valid_identifier_tests {
  use super::*;

  #[test]
  fn alphanumeric_identifier() {
    assert!(is_valid_identifier("some_identifier_v123"));
  }

  #[test]
  fn alphanumeric_with_colon() {
    assert!(is_valid_identifier("some_identifier:with_colon"));
  }

  #[test]
  fn uuid_is_valid() {
    let example_uuid = "a2b9e4d4-8d1f-4c7f-9c3d-5f4e4e6b1d1d";
    assert!(is_valid_identifier(example_uuid));
  }

  #[test]
  fn base64url_is_valid() {
    let example_base64url = "VGhlIP3-aWNrIGJyb3duIGZveCBqciAxMyBsYXp5IGRvZ_7_";
    assert!(is_valid_identifier(example_base64url))
  }

  #[test]
  fn standard_base64_is_invalid() {
    let example_base64 =
      "VGhlIP3+aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIDEzIGxhenkgZG9n/v8=";
    assert!(!is_valid_identifier(example_base64));
  }

  #[test]
  fn path_is_invalid() {
    assert!(!is_valid_identifier("some/path"));
  }

  #[test]
  fn url_is_invalid() {
    assert!(!is_valid_identifier("https://example.com"));
  }

  #[test]
  fn empty_is_invalid() {
    assert!(!is_valid_identifier(""));
  }
}
