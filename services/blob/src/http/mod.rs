use crate::{config::CONFIG, service::BlobService};

use actix_web::{web, App, HttpResponse, HttpServer};
use anyhow::Result;
use comm_lib::{
  auth::AuthService, http::auth::get_comm_authentication_middleware,
};
use tracing::info;

mod errors;
mod utils;

mod handlers {
  pub(super) mod blob;
  pub(super) mod holders;
}

pub async fn run_http_server(
  blob_service: BlobService,
  auth_service: AuthService,
) -> Result<()> {
  info!(
    "Starting HTTP server listening at port {}",
    CONFIG.http_port
  );
  HttpServer::new(move || {
    let auth_middleware = get_comm_authentication_middleware();
    App::new()
      .wrap(tracing_actix_web::TracingLogger::default())
      .wrap(comm_lib::http::cors_config(
        CONFIG.localstack_endpoint.is_some(),
      ))
      .app_data(auth_service.to_owned())
      .app_data(web::Data::new(blob_service.to_owned()))
      .route("/health", web::get().to(HttpResponse::Ok))
      .service(
        web::resource("/blob/{holder}")
          .wrap(auth_middleware.clone())
          .route(web::get().to(handlers::blob::get_blob_handler)),
      )
      .service(
        web::resource("/blob")
          .wrap(auth_middleware.clone())
          .route(web::put().to(handlers::blob::upload_blob_handler))
          .route(web::post().to(handlers::blob::assign_holder_handler))
          .route(web::delete().to(handlers::blob::remove_holder_handler)),
      )
      .service(
        web::resource("/holders")
          .wrap(auth_middleware)
          .route(web::get().to(handlers::holders::query_holders_handler))
          .route(web::post().to(handlers::holders::assign_holders_handler))
          .route(web::delete().to(handlers::holders::remove_holders_handler)),
      )
  })
  .bind(("0.0.0.0", CONFIG.http_port))?
  .run()
  .await?;

  Ok(())
}
