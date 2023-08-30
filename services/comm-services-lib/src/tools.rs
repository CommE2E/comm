use rand::{distributions::DistString, CryptoRng, Rng};

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

/// Defers call of the provided function to when [Defer] goes out of scope.
/// This can be used for cleanup code that must be run when e.g. the enclosing
/// function exits either by return or try operator `?`.
///
/// # Example
/// ```ignore
/// fn f(){
///     let _ = Defer::new(|| println!("cleanup"))
///     
///     // Cleanup will run if function would exit here
///     operation_that_can_fail()?;
///
///     if should_exit_early {
///       // Cleanup will run if function would exit here
///       return;
///     }
/// }
/// ```
pub struct Defer<'s>(Option<Box<dyn FnOnce() + 's>>);

impl<'s> Defer<'s> {
  pub fn new(f: impl FnOnce() + 's) -> Self {
    Self(Some(Box::new(f)))
  }

  /// Consumes the value, without calling the provided function
  ///
  /// # Example
  /// ```ignore
  /// // Start a "transaction"
  /// operation_that_should_be_reverted();
  /// let revert = Defer::new(|| println!("revert"))
  /// operation_that_can_fail()?;
  /// operation_that_can_fail()?;
  /// operation_that_can_fail()?;
  /// // Now we can "commit" the changes
  /// revert.cancel();
  /// ```
  pub fn cancel(mut self) {
    self.0 = None;
    // Implicit drop
  }
}

impl Drop for Defer<'_> {
  fn drop(&mut self) {
    if let Some(f) = self.0.take() {
      f();
    }
  }
}

pub fn generate_random_string(
  length: usize,
  rng: &mut (impl Rng + CryptoRng),
) -> String {
  rand::distributions::Alphanumeric.sample_string(rng, length)
}

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

  #[test]
  fn defer_runs() {
    fn f(a: &mut bool) {
      let _ = Defer::new(|| *a = true);
    }

    let mut v = false;
    f(&mut v);
    assert!(v)
  }

  #[test]
  fn consumed_defer_doesnt_run() {
    fn f(a: &mut bool) {
      let defer = Defer::new(|| *a = true);
      defer.cancel();
    }

    let mut v = false;
    f(&mut v);
    assert!(!v)
  }

  #[test]
  fn defer_runs_on_try() {
    fn f(a: &mut bool) -> Result<(), ()> {
      let _ = Defer::new(|| *a = true);
      Err(())
    }

    let mut v = false;
    let _ = f(&mut v);
    assert!(v)
  }
}
