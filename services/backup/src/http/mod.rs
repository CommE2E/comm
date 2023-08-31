use actix_web::{web, App, HttpResponse, HttpServer};
use anyhow::Result;
use comm_services_lib::{
  blob::client::BlobServiceClient,
  http::auth::get_comm_authentication_middleware,
};
use tracing::info;

use crate::{database::DatabaseClient, CONFIG};

mod handlers {
  pub(super) mod backup;
}

pub async fn run_http_server(
  db_client: DatabaseClient,
  blob_client: BlobServiceClient,
) -> Result<()> {
  info!(
    "Starting HTTP server listening at port {}",
    CONFIG.http_port
  );

  let db = web::Data::new(db_client);
  let blob = web::Data::new(blob_client);

  HttpServer::new(move || {
    App::new()
      .wrap(tracing_actix_web::TracingLogger::default())
      .wrap(comm_services_lib::http::cors_config(
        CONFIG.localstack_endpoint.is_some(),
      ))
      .app_data(db.clone())
      .app_data(blob.clone())
      .route("/health", web::get().to(HttpResponse::Ok))
      .service(
        // Services that don't require authetication
        web::scope("/backups/latest")
          .service(
            web::resource("{username}/backup_id")
              .route(web::get().to(handlers::backup::get_latest_backup_id)),
          )
          .service(web::resource("{username}/user_keys").route(
            web::get().to(handlers::backup::download_latest_backup_keys),
          )),
      )
      .service(
        // Services requiring authetication
        web::scope("/backups")
          .wrap(get_comm_authentication_middleware())
          .service(
            web::resource("").route(web::post().to(handlers::backup::upload)),
          )
          .service(
            web::resource("{backup_id}/user_keys")
              .route(web::get().to(handlers::backup::download_user_keys)),
          )
          .service(
            web::resource("{backup_id}/user_data")
              .route(web::get().to(handlers::backup::download_user_data)),
          ),
      )
  })
  .bind(("0.0.0.0", CONFIG.http_port))?
  .run()
  .await?;

  Ok(())
}
