use serde_json::Value;
use std::collections::{HashMap, HashSet};

type ReportContent = HashMap<String, Value>;

/// Returns a set of keys which differ for both objects
pub fn find_inconsistent_object_keys(
  first: &serde_json::Map<String, Value>,
  second: &serde_json::Map<String, Value>,
) -> HashSet<String> {
  let mut non_matching_ids = HashSet::new();
  for (k, v) in first {
    if !second.get(k).is_some_and(|it| v == it) {
      non_matching_ids.insert(k.to_string());
    }
  }
  for k in second.keys() {
    if !first.contains_key(k) {
      non_matching_ids.insert(k.to_string());
    }
  }
  non_matching_ids
}

pub fn inconsistent_thread_ids(content: &ReportContent) -> HashSet<String> {
  let Some(push_result) = content
    .get("pushResult")
    .and_then(Value::as_object) else { return HashSet::new(); };
  let Some(before_action) = content
    .get("beforeAction")
    .and_then(Value::as_object) else { return HashSet::new(); };

  find_inconsistent_object_keys(push_result, before_action)
}

pub fn inconsistent_user_ids(content: &ReportContent) -> HashSet<String> {
  let Some(before) = content
    .get("beforeStateCheck")
    .and_then(Value::as_object) else { return HashSet::new(); };
  let Some(after) = content
    .get("afterStateCheck")
    .and_then(Value::as_object) else { return HashSet::new(); };

  find_inconsistent_object_keys(before, after)
}

pub fn inconsistent_entry_ids(_content: &ReportContent) -> HashSet<String> {
  HashSet::from(["--Unimplemented--".to_string()])
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn test_inconsistent_object_keys() {
    let obj_a = json!({
      "foo": "bar",
      "a": 2,
      "b": "x",
      "c": false,
    });
    let obj_b = json!({
      "foo": "bar",
      "a": 2,
      "b": "y",
      "D": true,
    });

    let expected_keys =
      HashSet::from(["b".to_string(), "c".to_string(), "D".to_string()]);
    let inconsistent_keys = find_inconsistent_object_keys(
      obj_a.as_object().unwrap(),
      obj_b.as_object().unwrap(),
    );
    assert_eq!(&expected_keys, &inconsistent_keys);
  }
}
