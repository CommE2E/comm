use actix_web::error::ErrorForbidden;
use comm_lib::auth::AuthorizationCredential;

/// Validates given identifier variable and returns HTTP 400
/// in case of failure
#[macro_export]
macro_rules! validate_identifier {
  ($input_variable:expr) => {{
    if !comm_lib::tools::is_valid_identifier(&$input_variable) {
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

/// Returns HTTP 403 if caller is not a Comm service
pub fn verify_caller_is_service(
  requesting_identity: &AuthorizationCredential,
) -> actix_web::Result<()> {
  match requesting_identity {
    AuthorizationCredential::ServicesToken(_) => Ok(()),
    _ => Err(ErrorForbidden(
      "This endpoint can only be called by other services",
    )),
  }
}
