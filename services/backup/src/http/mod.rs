use actix_web::{web, App, HttpServer};
use anyhow::Result;
use tracing::info;

use crate::{database::DatabaseClient, CONFIG};

pub async fn run_http_server(db_client: DatabaseClient) -> Result<()> {
  info!(
    "Starting HTTP server listening at port {}",
    CONFIG.http_port
  );

  let db = web::Data::new(db_client);

  HttpServer::new(move || {
    App::new()
      .wrap(tracing_actix_web::TracingLogger::default())
      .wrap(comm_services_lib::http::cors_config(
        CONFIG.localstack_endpoint.is_some(),
      ))
      .app_data(db.clone())
      .service(
        web::resource("/hello").route(web::get().to(|| async { "world" })),
      )
  })
  .bind(("0.0.0.0", CONFIG.http_port))?
  .run()
  .await?;

  Ok(())
}
