use http::{HeaderName, HeaderValue};
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::{config::CONFIG, constants::cors};

pub fn cors_layer() -> CorsLayer {
  let allow_origin = match &CONFIG.allow_origin_list {
    None => AllowOrigin::mirror_request(),
    Some(allow_origin_list) => slice_to_allow_origin(allow_origin_list),
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

fn slice_to_allow_origin(origins: &str) -> AllowOrigin {
  let allow_origin_list = origins.split(',').map(|s| {
    HeaderValue::from_str(s.trim()).expect("failed to parse allow origin list")
  });
  AllowOrigin::list(allow_origin_list)
}
