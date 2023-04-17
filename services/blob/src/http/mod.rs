use crate::config::CONFIG;
use crate::database::DatabaseClient;
use crate::s3::S3Client;

use actix_web::{web, App, HttpServer};
use anyhow::Result;
use tracing::info;

mod context;
use context::AppContext;

mod handlers {
  pub(super) mod blob;

  // convenience exports to be used in handlers
  use super::context::{handle_db_error, AppContext};
}

pub async fn run_http_server(
  db_client: DatabaseClient,
  s3_client: S3Client,
) -> Result<()> {
  info!(
    "Starting HTTP server listening at port {}",
    CONFIG.listen_port
  );
  HttpServer::new(move || {
    // context that is passed to every handler
    let ctx = AppContext {
      db: db_client.to_owned(),
      s3: s3_client.to_owned(),
    };
    App::new()
      .wrap(tracing_actix_web::TracingLogger::default())
      .app_data(web::Data::new(ctx))
      .service(
        web::resource("/blob/{holder}")
          .route(web::get().to(handlers::blob::get_blob_handler))
          .route(web::delete().to(handlers::blob::delete_blob_handler)),
      )
      .service(
        web::resource("/blob")
          .route(web::put().to(handlers::blob::upload_blob_handler))
          .route(web::post().to(handlers::blob::assign_holder_handler)),
      )
  })
  .bind(("0.0.0.0", CONFIG.listen_port))?
  .run()
  .await?;

  Ok(())
}
