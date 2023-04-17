use crate::config::CONFIG;
use crate::database::DatabaseClient;
use crate::s3::S3Client;

use actix_web::{web, App, HttpServer};
use anyhow::Result;
use tracing::info;

mod context;
use context::AppContext;

async fn hello_handler() -> impl actix_web::Responder {
  "Hello, world!"
}

pub async fn run_http_server(
  db_client: DatabaseClient,
  s3_client: S3Client,
) -> Result<()> {
  info!(
    "Starting HTTP server listening at port {}",
    CONFIG.http_port
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
      .service(web::resource("/hello").route(web::get().to(hello_handler)))
  })
  .bind(("0.0.0.0", CONFIG.http_port))?
  .run()
  .await?;

  Ok(())
}
