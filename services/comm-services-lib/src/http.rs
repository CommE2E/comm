use actix_cors::Cors;

pub fn cors_config(is_sandbox: bool) -> Cors {
  // For local development, use relaxed CORS config
  if is_sandbox {
    // All origins, methods, request headers and exposed headers allowed.
    // Credentials supported. Max age 1 hour. Does not send wildcard.
    return Cors::permissive();
  }

  Cors::default()
    .allowed_origin("https://web.comm.app")
    // for local development using prod service
    .allowed_origin("http://localhost:3000")
    .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    .allow_any_header()
    .expose_any_header()
}
