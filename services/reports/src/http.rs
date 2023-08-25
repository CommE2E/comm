use actix_web::{web, App, HttpResponse, HttpServer};
use anyhow::Result;
use tracing::info;

use crate::config::CONFIG;
use crate::constants::REQUEST_BODY_JSON_SIZE_LIMIT;

pub async fn run_http_server() -> Result<()> {
  use actix_web::middleware::{Logger, NormalizePath};
  use comm_services_lib::http::cors_config;
  use tracing_actix_web::TracingLogger;

  info!(
    "Starting HTTP server listening at port {}",
    CONFIG.http_port
  );
  HttpServer::new(move || {
    let json_cfg =
      web::JsonConfig::default().limit(REQUEST_BODY_JSON_SIZE_LIMIT);
    App::new()
      .app_data(json_cfg)
      .wrap(Logger::default())
      .wrap(TracingLogger::default())
      .wrap(NormalizePath::trim())
      .wrap(cors_config(CONFIG.is_dev()))
      // Health endpoint for load balancers checks
      .route("/health", web::get().to(HttpResponse::Ok))
  })
  .bind(("0.0.0.0", CONFIG.http_port))?
  .run()
  .await?;

  Ok(())
}
