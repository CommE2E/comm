use once_cell::sync::Lazy;
use std::collections::HashSet;

fn get_reserved_usernames_set() -> HashSet<String> {
  // All entries in `reserved_usernames.json` must be lowercase and must also be
  // included in `lib/utils/reserved-users.js`!!
  let contents = include_str!("reserved_usernames.json");
  let reserved_usernames: Vec<String> = serde_json::from_str(contents).unwrap();

  reserved_usernames.into_iter().collect()
}
pub static RESERVED_USERNAME_SET: Lazy<HashSet<String>> =
  Lazy::new(get_reserved_usernames_set);
