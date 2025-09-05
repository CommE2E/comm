const ALLOWED_VALUES: [&str; 17] = [
  "ashoat",
  // NOTE: staff IDs below. Keep these in sync with `lib/facts/staff.js`
  "256",
  "518252",
  "379341",
  "1509097",
  "1329299",
  "1589929",
  "1629414",
  "2231519",
  "2775177",
  "2815499",
  "3033752",
  "3079802",
  "3197947",
  "6142155",
  "6646635",
  "9AAFD445-F64D-4557-A3F5-79387E95E9BA",
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
