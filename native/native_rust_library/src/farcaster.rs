pub fn farcaster_id_string_to_option(input: &str) -> Option<String> {
  if input.is_empty() {
    None
  } else {
    Some(input.to_string())
  }
}
