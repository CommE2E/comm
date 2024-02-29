use http::HeaderName;
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::{config::CONFIG, constants::cors};

pub fn cors_layer() -> CorsLayer {
  let allow_origin = CONFIG
    .allow_origin
    .clone()
    .unwrap_or_else(AllowOrigin::mirror_request);

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
