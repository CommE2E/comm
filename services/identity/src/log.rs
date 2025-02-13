use crate::config::CONFIG;

pub fn redact_sensitive_data(sensitive_data: &str) -> &str {
  const ALLOWED_VALUES: [&str; 1] =
    [crate::constants::staff::AUTHORITATIVE_KEYSERVER_OWNER_USER_ID];

  if ALLOWED_VALUES.contains(&sensitive_data) {
    return sensitive_data;
  }

  if CONFIG.redact_sensitive_data {
    "REDACTED"
  } else {
    sensitive_data
  }
}
