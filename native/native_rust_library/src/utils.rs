use grpc_clients::identity::REQUEST_METADATA_COOKIE_KEY;
use tonic::{
  metadata::{Ascii, MetadataValue},
  Request,
};

pub fn request_with_cookie<T>(
  message: T,
  cookie: Option<MetadataValue<Ascii>>,
) -> Request<T> {
  let mut request = Request::new(message);

  // Cookie won't be available in local dev environments
  if let Some(cookie_metadata) = cookie {
    request
      .metadata_mut()
      .insert(REQUEST_METADATA_COOKIE_KEY, cookie_metadata);
  }
  request
}
