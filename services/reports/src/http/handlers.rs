use actix_web::{get, post, web, HttpResponse};
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

#[get("/{report_id}")]
async fn get_single_report(
  path: web::Path<String>,
  service: ReportsService,
) -> actix_web::Result<HttpResponse> {
  let report_id = path.into_inner();
  let report = service.get_report(report_id.into()).await?.get_or_404()?;
  let response = HttpResponse::Ok().json(report);
  Ok(response)
}
