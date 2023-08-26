use actix_web::error::{
  ErrorBadRequest, ErrorInternalServerError, ErrorNotFound,
  ErrorServiceUnavailable, ErrorUnsupportedMediaType,
};
use actix_web::{web, App, HttpResponse, HttpServer, ResponseError};
use anyhow::Result;
use http::StatusCode;
use tracing::{debug, error, info, trace, warn};

use crate::config::CONFIG;
use crate::constants::REQUEST_BODY_JSON_SIZE_LIMIT;
use crate::service::{ReportsService, ReportsServiceError};

mod handlers;

pub async fn run_http_server(service: ReportsService) -> Result<()> {
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
      .app_data(service.to_owned())
      .wrap(Logger::default())
      .wrap(TracingLogger::default())
      .wrap(NormalizePath::trim())
      .wrap(cors_config(CONFIG.is_dev()))
      // Health endpoint for load balancers checks
      .route("/health", web::get().to(HttpResponse::Ok))
      .service(
        web::scope("/reports")
          .service(handlers::post_reports)
          .service(handlers::get_single_report),
      )
  })
  .bind(("0.0.0.0", CONFIG.http_port))?
  .run()
  .await?;

  Ok(())
}

fn handle_reports_service_error(err: &ReportsServiceError) -> actix_web::Error {
  use aws_sdk_dynamodb::Error as DynamoDBError;
  use comm_services_lib::database::Error as DBError;

  trace!("Handling reports service error: {:?}", err);
  match err {
    ReportsServiceError::UnsupportedReportType => {
      ErrorUnsupportedMediaType("unsupported report type")
    }
    ReportsServiceError::SerdeError(err) => {
      error!("Serde error: {0:?} - {0}", err);
      ErrorInternalServerError("internal error")
    }
    ReportsServiceError::ParseError(err) => {
      debug!("Parse error: {0:?} - {0}", err);
      ErrorBadRequest("invalid input format")
    }
    ReportsServiceError::BlobError(err) => {
      error!("Blob Service error: {0:?} - {0}", err);
      ErrorInternalServerError("internal error")
    }
    ReportsServiceError::DatabaseError(db_err) => match db_err {
      // retriable errors
      DBError::MaxRetriesExceeded
      | DBError::AwsSdk(
        DynamoDBError::InternalServerError(_)
        | DynamoDBError::ProvisionedThroughputExceededException(_)
        | DynamoDBError::RequestLimitExceeded(_),
      ) => {
        warn!("AWS transient error occurred");
        ErrorServiceUnavailable("please retry")
      }
      err => {
        error!("Unexpected database error: {0:?} - {0}", err);
        ErrorInternalServerError("internal error")
      }
    },
    #[allow(unreachable_patterns)]
    err => {
      error!("Received an unexpected error: {0:?} - {0}", err);
      ErrorInternalServerError("server error")
    }
  }
}

/// This allow us to `await?` blob service calls in HTTP handlers
impl ResponseError for ReportsServiceError {
  fn error_response(&self) -> HttpResponse {
    handle_reports_service_error(self).error_response()
  }

  fn status_code(&self) -> StatusCode {
    handle_reports_service_error(self)
      .as_response_error()
      .status_code()
  }
}

trait NotFoundHandler<T> {
  /// Returns `Ok(T)` if `self` is `Some(T)`,
  /// otherwise returns a `404 Not Found` error.
  fn unwrap_or_404(self) -> actix_web::Result<T>;
}
impl<T> NotFoundHandler<T> for Option<T> {
  fn unwrap_or_404(self) -> actix_web::Result<T> {
    self.ok_or_else(|| ErrorNotFound("not found"))
  }
}
