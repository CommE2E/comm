use std::error::Error as StdError;
use tonic::codegen::futures_core::Stream;

pub type BoxedError = Box<dyn StdError>;
// Trait type aliases aren't supported in Rust, but
// we can workaround this by creating an empty trait
// that extends the traits we want to alias.
#[rustfmt::skip]
pub trait ByteStream:
  Stream<Item = Result<Vec<u8>, BoxedError>> {}
#[rustfmt::skip]
impl<T> ByteStream for T where
  T: Stream<Item = Result<Vec<u8>, BoxedError>> {}

pub trait MemOps {
  fn take_out(&mut self) -> Self;
}

impl<T> MemOps for Vec<T> {
  /// Moves all the elements of `self` into a new [`Vec`] instance,
  /// leaving `self` empty. **No copying is performed.**
  /// The memory capacity of `self` stays unchanged.
  ///
  /// In fact, this is the same as [`std::mem::take`] but maintains capacity.
  ///
  /// # Example
  /// ```
  /// let mut a = vec![1,2,3,4];
  /// let b = a.take_out();
  /// assert_eq!(b.len(), 4);
  /// assert!(a.is_empty());
  /// assert_eq!(a.capacity(), b.capacity());
  /// ```
  fn take_out(&mut self) -> Self {
    let mut new_vec = Vec::with_capacity(self.capacity());
    std::mem::swap(self, &mut new_vec);
    new_vec
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_memops_move_and_clear() {
    let mut a = vec![1, 2, 3, 4];
    let a_ptr_before = a.as_ptr();

    let b = a.take_out();
    let a_ptr_after = a.as_ptr();
    let b_ptr_after = b.as_ptr();

    assert_ne!(a_ptr_before, a_ptr_after, "Old ptr didn't change");
    assert_eq!(a_ptr_before, b_ptr_after, "Ptr addresses don't match");
    assert_eq!(a.capacity(), b.capacity(), "Capacities don't match");
    assert!(a.is_empty(), "Original vec isn't empty after move");
    assert_eq!(b.len(), 4, "Moved length don't match");
  }
}
