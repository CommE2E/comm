use crate::config::CONFIG;
use crate::database::DatabaseClient;
use crate::s3::S3Client;

use actix_web::{web, App, HttpServer};
use anyhow::Result;
use tracing::info;

async fn hello_handler() -> impl actix_web::Responder {
  "Hello, world!"
}

// disable unused warning for now
#[allow(unused)]
pub async fn run_http_server(
  db_client: DatabaseClient,
  s3_client: S3Client,
) -> Result<()> {
  info!(
    "Starting HTTP server listening at port {}",
    CONFIG.http_port
  );
  HttpServer::new(move || {
    App::new()
      .wrap(tracing_actix_web::TracingLogger::default())
      .service(web::resource("/hello").route(web::get().to(hello_handler)))
  })
  .bind(("0.0.0.0", CONFIG.http_port))?
  .run()
  .await?;

  Ok(())
}
