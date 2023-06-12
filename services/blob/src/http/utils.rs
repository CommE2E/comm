/// Validates given identifier variable and returns HTTP 400
/// in case of failure
#[macro_export]
macro_rules! validate_identifier {
  ($input_variable:expr) => {{
    if !comm_services_lib::tools::is_valid_identifier(&$input_variable) {
      let variable_name = stringify!($input_variable);
      tracing::warn!(
        "{} is not a valid identifier: {}",
        variable_name,
        $input_variable
      );
      return Err(ErrorBadRequest("Bad request"));
    }
  }};
}
