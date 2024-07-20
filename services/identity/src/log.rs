use crate::config::CONFIG;

pub fn redact_sensitive_data(sensitive_data: &str) -> &str {
  if CONFIG.redact_sensitive_data {
    "REDACTED"
  } else {
    sensitive_data
  }
}
