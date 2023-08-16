use crate::{config::CONFIG, service::BlobService};

use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use anyhow::Result;
use tracing::info;

mod errors;
mod utils;

mod handlers {
  pub(super) mod blob;
}

fn cors_config() -> Cors {
  // For local development, use relaxed CORS config
  if CONFIG.localstack_endpoint.is_some() {
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

pub async fn run_http_server(blob_service: BlobService) -> Result<()> {
  info!(
    "Starting HTTP server listening at port {}",
    CONFIG.http_port
  );
  HttpServer::new(move || {
    App::new()
      .wrap(tracing_actix_web::TracingLogger::default())
      .wrap(cors_config())
      .app_data(web::Data::new(blob_service.to_owned()))
      .service(
        web::resource("/blob/{holder}")
          .route(web::get().to(handlers::blob::get_blob_handler)),
      )
      .service(
        web::resource("/blob")
          .route(web::put().to(handlers::blob::upload_blob_handler))
          .route(web::post().to(handlers::blob::assign_holder_handler))
          .route(web::delete().to(handlers::blob::remove_holder_handler)),
      )
  })
  .bind(("0.0.0.0", CONFIG.http_port))?
  .run()
  .await?;

  Ok(())
}
