use actix_web::{post, web, HttpResponse};
use serde::Deserialize;

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

#[post("/reports")]
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
