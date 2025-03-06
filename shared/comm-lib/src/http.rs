pub mod auth;
pub mod auth_service;
pub mod multipart;

use std::collections::HashSet;

use crate::tools::BoxedError;
use actix_cors::Cors;
use actix_web::web::Bytes;
use futures_core::Stream;

use once_cell::sync::Lazy;

static ALLOWED_ORIGINS: Lazy<HashSet<String>> = Lazy::new(|| {
  std::env::var("ALLOW_ORIGIN_LIST")
    .unwrap_or_default()
    .split(',')
    .map(|it| it.trim().to_string())
    .filter(|it| !it.is_empty())
    .collect()
});

pub fn cors_config(is_sandbox: bool) -> Cors {
  // For local development, use relaxed CORS config
  if is_sandbox {
    // All origins, methods, request headers and exposed headers allowed.
    // Credentials supported. Max age 1 hour. Does not send wildcard.
    return Cors::permissive();
  }

  Cors::default()
    .allowed_origin("https://web.comm.app")
    .allowed_origin("https://comm.software")
    .allowed_origin_fn(|origin_header, _| match origin_header.to_str() {
      Ok(origin) => ALLOWED_ORIGINS.contains(origin),
      _ => false,
    })
    // for local development using prod service
    .allowed_origin("http://localhost:3000")
    .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    .allow_any_header()
    .expose_any_header()
}

// Trait type aliases aren't supported in Rust, but
// we can workaround this by creating an empty trait
// that extends the traits we want to alias.
#[rustfmt::skip]
pub trait ByteStream:
  Stream<Item = Result<Bytes, BoxedError>> {}
#[rustfmt::skip]
impl<T> ByteStream for T where
  T: Stream<Item = Result<Bytes, BoxedError>> {}
