use http::HeaderName;
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::constants::{
  DEFAULT_ALLOW_HEADERS, DEFAULT_EXPOSED_HEADERS, DEFAULT_MAX_AGE,
};

pub fn cors_layer() -> CorsLayer {
  CorsLayer::new()
    .allow_origin(AllowOrigin::mirror_request())
    .allow_credentials(true)
    .max_age(DEFAULT_MAX_AGE)
    .expose_headers(
      DEFAULT_EXPOSED_HEADERS
        .iter()
        .cloned()
        .map(HeaderName::from_static)
        .collect::<Vec<HeaderName>>(),
    )
    .allow_headers(
      DEFAULT_ALLOW_HEADERS
        .iter()
        .cloned()
        .map(HeaderName::from_static)
        .collect::<Vec<HeaderName>>(),
    )
}
