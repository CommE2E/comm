use grpc_clients::error::unsupported_version;
use tonic::{Request, Status};
use tracing::debug;

use crate::constants::{
  CODE_VERSION_METADATA_NAME, DEVICE_TYPE_METADATA_NAME,
  MIN_SUPPORTED_NATIVE_VERSION,
};

pub fn version_interceptor(req: Request<()>) -> Result<Request<()>, Status> {
  debug!("Intercepting request to check version: {:?}", req);

  match get_version_info(&req) {
    Some((version, platform))
      if (platform == "ios" || platform == "android")
        && version < MIN_SUPPORTED_NATIVE_VERSION =>
    {
      Err(unsupported_version())
    }
    _ => Ok(req),
  }
}

fn get_version_info(req: &Request<()>) -> Option<(u64, String)> {
  debug!("Retrieving version info for request: {:?}", req);

  let code_version: u64 =
    get_value(req, CODE_VERSION_METADATA_NAME)?.parse().ok()?;
  let device_type = get_value(req, DEVICE_TYPE_METADATA_NAME)?;

  Some((code_version, device_type))
}

pub fn get_value<T>(req: &Request<T>, key: &str) -> Option<String> {
  let raw_value = req.metadata().get(key)?;
  raw_value.to_str().ok().map(|s| s.to_string())
}
