#[cfg(feature = "aws")]
mod service;
mod types;

#[cfg(feature = "aws")]
pub use service::*;
pub use types::*;

use crate::constants::DISABLE_CSAT_VERIFICATION_ENV_VAR;
use once_cell::sync::Lazy;

static CSAT_VERIFICATION_DISABLED: Lazy<bool> = Lazy::new(|| {
  let is_disabled = std::env::var(DISABLE_CSAT_VERIFICATION_ENV_VAR)
    .is_ok_and(|value| ["1", "true"].contains(&value.as_str()));

  if is_disabled {
    tracing::warn!(
      "CSAT verification is disabled! All requests will be unauthenticated!"
    );
  }

  is_disabled
});

pub fn is_csat_verification_disabled() -> bool {
  *Lazy::force(&CSAT_VERIFICATION_DISABLED)
}
