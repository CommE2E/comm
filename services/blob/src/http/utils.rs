use actix_web::error::ErrorForbidden;
use actix_web::error::{ErrorBadRequest, ErrorRangeNotSatisfiable};
use actix_web::{
  http::header::{ByteRangeSpec, Range},
  web,
};
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

/// Returns a tuple of first and last byte number (inclusive) represented by given range header.
pub fn parse_range_header(
  range_header: &Option<web::Header<Range>>,
  file_size: u64,
) -> actix_web::Result<(u64, u64)> {
  let (range_start, range_end): (u64, u64) = match range_header {
    Some(web::Header(Range::Bytes(ranges))) => {
      if ranges.len() > 1 {
        return Err(ErrorBadRequest("Multiple ranges not supported"));
      }

      match ranges[0] {
        ByteRangeSpec::FromTo(start, end) => {
          if end >= file_size || start > end {
            return Err(ErrorRangeNotSatisfiable("Range not satisfiable"));
          }
          (start, end)
        }
        ByteRangeSpec::From(start) => {
          if start >= file_size {
            return Err(ErrorRangeNotSatisfiable("Range not satisfiable"));
          }
          (start, file_size - 1)
        }
        ByteRangeSpec::Last(length) => {
          if length >= file_size {
            return Err(ErrorRangeNotSatisfiable("Range not satisfiable"));
          }
          (file_size - length, file_size - 1)
        }
      }
    }
    Some(web::Header(Range::Unregistered(..))) => {
      return Err(ErrorBadRequest("Use ranges registered at IANA"));
    }
    None => (0, file_size - 1),
  };

  Ok((range_start, range_end))
}
