use actix_web::{get, post, web, HttpResponse};
use comm_lib::http::auth::get_comm_authentication_middleware as auth_middleware;
use http::header;
use serde::Deserialize;

use super::NotFoundHandler;

use crate::report_types::ReportInput;
use crate::service::ReportsService;

/// POST endpoint accepts either a single report Object
/// or an array of reports
#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum PostReportsPayload {
  Single(ReportInput),
  Multiple(Vec<ReportInput>),
}
impl PostReportsPayload {
  pub fn into_vec(self) -> Vec<ReportInput> {
    match self {
      Self::Single(report) => vec![report],
      Self::Multiple(reports) => reports,
    }
  }
}

#[post("")]
async fn post_reports(
  payload: web::Json<PostReportsPayload>,
  service: ReportsService,
) -> actix_web::Result<HttpResponse> {
  use serde_json::json;

  let payload = payload.into_inner();
  let ids = service.save_reports(payload.into_vec()).await?;
  let response = HttpResponse::Created().json(json!({ "reportIDs": ids }));
  Ok(response)
}

#[derive(Debug, Deserialize)]
struct QueryOptions {
  cursor: Option<String>,
  page_size: Option<u32>,
  // there can be more options here in the future
  // e.g. filter by platform, report type, user, etc.
}

#[get("", wrap = "auth_middleware()")]
async fn query_reports(
  query: web::Query<QueryOptions>,
  service: ReportsService,
) -> actix_web::Result<HttpResponse> {
  let QueryOptions { cursor, page_size } = query.into_inner();
  let page = service.list_reports(cursor, page_size).await?;
  let response = HttpResponse::Ok().json(page);
  Ok(response)
}

#[get("/{report_id}", wrap = "auth_middleware()")]
async fn get_single_report(
  path: web::Path<String>,
  service: ReportsService,
) -> actix_web::Result<HttpResponse> {
  let report_id = path.into_inner();
  let report = service
    .get_report(report_id.into())
    .await?
    .unwrap_or_404()?;
  let response = HttpResponse::Ok().json(report);
  Ok(response)
}

#[get("/{report_id}/redux-devtools.json", wrap = "auth_middleware()")]
async fn redux_devtools_import(
  path: web::Path<String>,
  service: ReportsService,
) -> actix_web::Result<HttpResponse> {
  let report_id = path.into_inner();
  let devtools_json = service
    .get_redux_devtools_import(report_id.clone().into())
    .await?
    .unwrap_or_404()?;

  let response = HttpResponse::Ok()
    .insert_header((
      header::CONTENT_DISPOSITION,
      format!("attachment; filename=report-{}.json", report_id),
    ))
    .json(devtools_json);
  Ok(response)
}
