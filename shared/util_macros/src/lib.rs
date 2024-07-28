extern crate proc_macro;
use proc_macro::TokenStream;

mod tag_aware_deserialize;

/// Fixes [`serde::Deserialize`] implementation for deserializing
/// untagged enums of internally tagged structs. Original implementation
/// totally ignores the `tag` attribute when deserializing enum variants.
///
/// This derive requires two serde attributes to be present:
/// `#[serde(tag = "type", remote = "Self")]`
///
/// ### Example
/// ```
/// use serde::{Deserialize, Serialize};
/// use util_macros::TagAwareDeserialize;
///
/// // Note that FirstStruct and SecondStruct have identical fields
/// // They're only distinguishable by 'tag'
/// #[derive(Debug, Serialize, Deserialize, TagAwareDeserialize)]
/// #[serde(tag = "type", remote = "Self")]
/// struct FirstStruct {
///   foo: String,
///   bar: String,
/// }
/// #[derive(Debug, Serialize, Deserialize, TagAwareDeserialize)]
/// #[serde(tag = "type", remote = "Self")]
/// struct SecondStruct {
///   foo: String,
///   bar: String,
/// }
///
/// #[derive(Debug, Serialize, Deserialize)]
/// #[serde(untagged)]
/// enum EitherStruct {
///   // Note that FirstStruct is BEFORE SecondStruct
///   FirstStruct(FirstStruct),
///   SecondStruct(SecondStruct),
/// }
///
/// let input = SecondStruct {
///   foo: "a".to_string(),
///   bar: "b".to_string(),
/// };
/// let serialized = serde_json::to_string(&input).unwrap();
///
/// let deserialized: EitherStruct = serde_json::from_str(&serialized).unwrap();
/// match deserialized {
///   EitherStruct::SecondStruct(result) => {
///     println!("Successfully deserialized {:?}", result);
///   },
///   other => {
///     println!("Wrong variant was deserialized: {:?}", other);
///   }
/// };
///
/// ```
#[proc_macro_derive(TagAwareDeserialize)]
pub fn tag_aware_deserialize_macro_derive(input: TokenStream) -> TokenStream {
  let ast = syn::parse(input).unwrap();
  tag_aware_deserialize::impl_tag_aware_deserialize_macro(&ast)
}
