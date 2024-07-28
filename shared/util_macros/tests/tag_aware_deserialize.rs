// Structs with plain serde derives
mod serde_deserialize_example {
  use serde::{Deserialize, Serialize};

  // Note that FirstStruct and SecondStruct have identical fields
  #[derive(Debug, Serialize, Deserialize)]
  #[serde(tag = "type")]
  pub struct FirstStruct {
    pub foo: String,
    pub bar: String,
  }
  #[derive(Debug, Serialize, Deserialize)]
  #[serde(tag = "type")]
  pub struct SecondStruct {
    pub foo: String,
    pub bar: String,
  }
  #[derive(Debug, Serialize, Deserialize)]
  #[serde(tag = "type")]
  pub struct OtherStruct {
    pub baz: String,
  }

  #[derive(Debug, Serialize, Deserialize)]
  #[serde(untagged)]
  #[allow(clippy::enum_variant_names)]
  pub enum EitherStruct {
    // Note that FirstStruct is BEFORE SecondStruct
    OtherStruct(OtherStruct),
    FirstStruct(FirstStruct),
    SecondStruct(SecondStruct),
  }
}

// Structs with serde and `TagAwareDeserialize` derive
mod tag_aware_deserialize_example {
  use serde::{Deserialize, Serialize};
  use util_macros::TagAwareDeserialize;

  // Note that FirstStruct and SecondStruct have identical fields
  #[derive(Debug, Serialize, Deserialize, TagAwareDeserialize)]
  #[serde(tag = "type", remote = "Self")]
  pub struct FirstStruct {
    pub foo: String,
    pub bar: String,
  }
  #[derive(Debug, Serialize, Deserialize, TagAwareDeserialize)]
  #[serde(tag = "type", remote = "Self")]
  pub struct SecondStruct {
    pub foo: String,
    pub bar: String,
  }
  #[derive(Debug, Serialize, Deserialize, TagAwareDeserialize)]
  #[serde(tag = "type", remote = "Self")]
  pub struct OtherStruct {
    pub baz: String,
  }

  #[derive(Debug, Serialize, Deserialize)]
  #[serde(untagged)]
  #[allow(clippy::enum_variant_names)]
  pub enum EitherStruct {
    // Note that FirstStruct is BEFORE SecondStruct
    OtherStruct(OtherStruct),
    FirstStruct(FirstStruct),
    SecondStruct(SecondStruct),
  }
}

#[test]
fn serde_deserialize_ignores_tag() {
  use serde_deserialize_example::OtherStruct;

  let with_tag = r#"{"type":"OtherStruct","baz":"abc"}"#;
  let without_tag = r#"{"baz":"abc"}"#;

  let deserialized_with_tag = serde_json::from_str::<OtherStruct>(with_tag);
  let deserialized_without_tag =
    serde_json::from_str::<OtherStruct>(without_tag);

  assert!(deserialized_with_tag.is_ok());
  assert!(deserialized_without_tag.is_ok());
}

#[test]
fn tag_aware_deserialize_requires_tag() {
  use tag_aware_deserialize_example::OtherStruct;

  let with_tag = r#"{"type":"OtherStruct","baz":"abc"}"#;
  let without_tag = r#"{"baz":"abc"}"#;

  let deserialized_with_tag = serde_json::from_str::<OtherStruct>(with_tag);
  let deserialized_without_tag =
    serde_json::from_str::<OtherStruct>(without_tag);

  assert!(deserialized_with_tag.is_ok());
  assert!(deserialized_without_tag.is_err());
}

#[test]
#[ignore = "this test is expected to fail until serde fixes it"]
fn serde_deserializes_wrong_variant_demo() {
  use serde_deserialize_example::*;

  let input = SecondStruct {
    foo: "a".to_string(),
    bar: "b".to_string(),
  };
  let serialized = serde_json::to_string(&input).unwrap();

  let deserialized: EitherStruct = serde_json::from_str(&serialized).unwrap();
  match deserialized {
    EitherStruct::SecondStruct(_) => (), // should be this
    other => {
      // It fails here, `FirstStruct` is deserialized instead
      std::panic::panic_any(format!("Wrong struct deserialized: {:?}", other))
    }
  };
}

#[test]
fn tag_aware_deserialize_returns_correct_variant() {
  use tag_aware_deserialize_example::*;

  let input = SecondStruct {
    foo: "a".to_string(),
    bar: "b".to_string(),
  };
  let serialized = serde_json::to_string(&input).unwrap();

  let deserialized: EitherStruct = serde_json::from_str(&serialized).unwrap();
  match deserialized {
    EitherStruct::SecondStruct(_) => (), // should be this
    other => {
      std::panic::panic_any(format!("Wrong struct deserialized: {:?}", other))
    }
  };
}
