use http::{HeaderName, HeaderValue};
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::{
  config::{RemoteEnvironment, CONFIG},
  constants::cors,
};

pub fn cors_layer() -> CorsLayer {
  let allow_origin = match CONFIG.remote_environment {
    None => AllowOrigin::mirror_request(),
    Some(RemoteEnvironment::Staging) => AllowOrigin::list(
      cors::STAGING_ALLOW_ORIGIN_LIST
        .iter()
        .cloned()
        .map(HeaderValue::from_static),
    ),
    Some(RemoteEnvironment::Production) => AllowOrigin::list(
      cors::PROD_ALLOW_ORIGIN_LIST
        .iter()
        .cloned()
        .map(HeaderValue::from_static),
    ),
  };
  CorsLayer::new()
    .allow_origin(allow_origin)
    .allow_credentials(true)
    .max_age(cors::DEFAULT_MAX_AGE)
    .expose_headers(
      cors::DEFAULT_EXPOSED_HEADERS
        .iter()
        .cloned()
        .map(HeaderName::from_static)
        .collect::<Vec<HeaderName>>(),
    )
    .allow_headers(
      cors::DEFAULT_ALLOW_HEADERS
        .iter()
        .cloned()
        .map(HeaderName::from_static)
        .collect::<Vec<HeaderName>>(),
    )
}
