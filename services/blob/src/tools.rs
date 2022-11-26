use crate::constants;
use std::env;

fn is_env_flag_set(env_var_name: &str) -> bool {
  let flag_value = env::var(env_var_name).unwrap_or_default().to_lowercase();
  return ["1", "true"].contains(&flag_value.as_str());
}

/// Returns true if the `COMM_SERVICES_SANDBOX` environment variable is set
pub fn is_sandbox_env() -> bool {
  return is_env_flag_set(constants::SANDBOX_ENV_VAR);
}
