use grpc_clients::error::unsupported_version;
use tonic::{Request, Status};
use tracing::trace;

use crate::constants::{
  request_metadata, tonic_status_messages, MIN_SUPPORTED_NATIVE_VERSION,
  MIN_SUPPORTED_WEB_VERSION,
};

pub use grpc_clients::identity::shared::PlatformMetadata;

pub fn version_interceptor(req: Request<()>) -> Result<Request<()>, Status> {
  trace!("Intercepting request to check version: {:?}", req);

  match get_version_info(&req) {
    Some((version, platform))
      if (platform == "ios" || platform == "android")
        && version < MIN_SUPPORTED_NATIVE_VERSION =>
    {
      Err(unsupported_version())
    }
    Some((version, platform))
      if (platform == "web"
        || platform == "windows"
        || platform == "mac_os")
        && version < MIN_SUPPORTED_WEB_VERSION =>
    {
      Err(unsupported_version())
    }
    _ => Ok(req),
  }
}

fn get_version_info<T: std::fmt::Debug>(
  req: &Request<T>,
) -> Option<(u64, String)> {
  trace!("Retrieving version info for request: {:?}", req);

  let code_version: u64 = get_value(req, request_metadata::CODE_VERSION)?
    .parse()
    .ok()?;
  let device_type = get_value(req, request_metadata::DEVICE_TYPE)?;

  Some((code_version, device_type))
}

pub fn get_platform_metadata<T: std::fmt::Debug>(
  req: &Request<T>,
) -> Result<PlatformMetadata, Status> {
  let (code_version, device_type) = get_version_info(req).ok_or_else(|| {
    Status::invalid_argument(
      tonic_status_messages::MISSING_PLATFORM_OR_CODE_VERSION_METADATA,
    )
  })?;
  let state_version = get_value(req, request_metadata::STATE_VERSION)
    .and_then(|it| it.parse().ok());
  let major_desktop_version =
    get_value(req, request_metadata::MAJOR_DESKTOP_VERSION)
      .and_then(|it| it.parse().ok());

  Ok(PlatformMetadata {
    code_version,
    device_type,
    state_version,
    major_desktop_version,
  })
}

pub fn get_value<T>(req: &Request<T>, key: &str) -> Option<String> {
  let raw_value = req.metadata().get(key)?;
  raw_value.to_str().ok().map(|s| s.to_string())
}
