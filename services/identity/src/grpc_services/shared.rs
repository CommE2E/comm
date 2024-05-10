use grpc_clients::error::unsupported_version;
use tonic::{IntoRequest, Request, Status};
use tracing::{trace, Instrument};

use crate::constants::{request_metadata, MIN_SUPPORTED_NATIVE_VERSION};

pub fn version_interceptor(req: Request<()>) -> Result<Request<()>, Status> {
  trace!("Intercepting request to check version: {:?}", req);

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
  trace!("Retrieving version info for request: {:?}", req);

  let code_version: u64 = get_value(req, request_metadata::CODE_VERSION)?
    .parse()
    .ok()?;
  let device_type = get_value(req, request_metadata::DEVICE_TYPE)?;

  Some((code_version, device_type))
}

pub fn get_value<T>(req: &Request<T>, key: &str) -> Option<String> {
  let raw_value = req.metadata().get(key)?;
  raw_value.to_str().ok().map(|s| s.to_string())
}
