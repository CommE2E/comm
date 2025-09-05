const ALLOWED_VALUES: [&str; 2] = [
  "ashoat",
  crate::constants::staff::AUTHORITATIVE_KEYSERVER_OWNER_USER_ID,
];

pub fn base_redact_sensitive_data(
  sensitive_data: &str,
  should_redact: bool,
) -> &str {
  if ALLOWED_VALUES.contains(&sensitive_data) {
    return sensitive_data;
  }

  if should_redact {
    "REDACTED"
  } else {
    sensitive_data
  }
}
