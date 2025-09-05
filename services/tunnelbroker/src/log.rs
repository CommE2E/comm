use comm_lib::sensitive_data::base_redact_sensitive_data;

use crate::config::CONFIG;

pub fn redact_sensitive_data(sensitive_data: &str) -> &str {
  base_redact_sensitive_data(sensitive_data, CONFIG.redact_sensitive_data)
}
