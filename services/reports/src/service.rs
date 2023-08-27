use actix_web::FromRequest;
use comm_services_lib::{
  auth::UserIdentity,
  blob::client::{BlobServiceClient, BlobServiceError},
  database,
};
use derive_more::{Display, Error, From};
use std::{
  collections::HashMap,
  future::{ready, Ready},
};
use tracing::error;

use crate::{
  database::{
    client::{DatabaseClient, ReportsPage},
    item::ReportItem,
  },
  report_types::{ReportID, ReportInput, ReportOutput, ReportType},
};

#[derive(Debug, Display, Error, From)]
pub enum ReportsServiceError {
  DatabaseError(database::Error),
  BlobError(BlobServiceError),
  /// Error during parsing user input
  /// Usually this indicates user error
  #[from(ignore)]
  ParseError(serde_json::Error),
  /// Error during serializing/deserializing internal data
  /// This is usually a service bug / data inconsistency
  #[from(ignore)]
  SerdeError(serde_json::Error),
  /// Unsupported report type
  /// Returned when trying to perform an operation on an incompatible report type
  /// e.g. create a Redux Devtools import from a media mission report
  UnsupportedReportType,
  /// Unexpected error
  Unexpected,
}

type ServiceResult<T> = Result<T, ReportsServiceError>;

#[derive(Clone)]
pub struct ReportsService {
  db: DatabaseClient,
  blob_client: BlobServiceClient,
  requesting_user_id: Option<String>,
}

impl ReportsService {
  pub fn new(db: DatabaseClient, blob_client: BlobServiceClient) -> Self {
    Self {
      db,
      blob_client,
      requesting_user_id: None,
    }
  }

  pub fn authenticated(&self, user: UserIdentity) -> Self {
    let user_id = user.user_id.to_string();
    Self {
      db: self.db.clone(),
      blob_client: self.blob_client.with_user_identity(user),
      requesting_user_id: Some(user_id),
    }
  }

  pub async fn save_reports(
    &self,
    reports: Vec<ReportInput>,
  ) -> ServiceResult<Vec<ReportID>> {
    let mut items = Vec::with_capacity(reports.len());
    let mut tasks = tokio::task::JoinSet::new();

    // 1. Concurrently upload reports to blob service if needed
    for input in reports {
      let blob_client = self.blob_client.clone();
      let user_id = self.requesting_user_id.clone();
      tasks.spawn(async move {
        let mut item = ReportItem::from_input(input, user_id)
          .map_err(ReportsServiceError::SerdeError)?;
        item.ensure_size_constraints(&blob_client).await?;
        Ok(item)
      });
    }

    // 2. Wait for all uploads to complete and collect results
    // If any of them failed, abort
    while let Some(task) = tasks.join_next().await {
      let result: Result<_, ReportsServiceError> = task.map_err(|err| {
        error!("Task failed to join: {err}");
        ReportsServiceError::Unexpected
      })?;
      items.push(result?);
    }

    // 3. Store reports in database
    let ids = items.iter().map(|item| item.id.clone()).collect();
    self.db.save_reports(items).await?;
    Ok(ids)
  }

  pub async fn get_report(
    &self,
    report_id: ReportID,
  ) -> ServiceResult<Option<ReportOutput>> {
    let Some(report_item) = self.db.get_report(&report_id).await? else {
      return Ok(None);
    };
    let ReportItem {
      user_id,
      report_type,
      platform,
      creation_time,
      content,
      ..
    } = report_item;

    let report_data = content.fetch_bytes(&self.blob_client).await?;
    let report_json = serde_json::from_slice(report_data.as_slice())
      .map_err(ReportsServiceError::SerdeError)?;

    let output = ReportOutput {
      id: report_id,
      user_id,
      platform,
      report_type,
      creation_time,
      content: report_json,
    };
    Ok(Some(output))
  }

  pub async fn get_redux_devtools_import(
    &self,
    report_id: ReportID,
  ) -> ServiceResult<Option<serde_json::Value>> {
    let Some(report) = self.get_report(report_id).await? else {
      return Ok(None);
    };
    if !matches!(report.report_type, ReportType::ErrorReport) {
      return Err(ReportsServiceError::UnsupportedReportType);
    };

    let redux_devtools_payload = prepare_redux_devtools_import(report.content)
      .map_err(ReportsServiceError::SerdeError)?;
    Ok(Some(redux_devtools_payload))
  }

  pub async fn list_reports(
    &self,
    cursor: Option<String>,
  ) -> ServiceResult<ReportsPage> {
    let page = self.db.scan_reports(cursor).await?;
    Ok(page)
  }
}

impl FromRequest for ReportsService {
  type Error = actix_web::Error;
  type Future = Ready<Result<Self, actix_web::Error>>;

  #[inline]
  fn from_request(
    req: &actix_web::HttpRequest,
    _payload: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    use actix_web::HttpMessage;

    let Some(service) = req.app_data::<ReportsService>() else {
      tracing::error!(
        "FATAL! Failed to extract ReportsService from actix app_data. \
        Check HTTP server configuration"
      );
      return ready(Err(actix_web::error::ErrorInternalServerError("Internal server error")));
    };

    let auth_service =
      if let Some(user_identity) = req.extensions().get::<UserIdentity>() {
        tracing::trace!("Found user identity. Creating authenticated service");
        service.authenticated(user_identity.clone())
      } else {
        tracing::trace!(
          "No user identity found. Leaving unauthenticated service"
        );
        service.clone()
      };

    ready(Ok(auth_service))
  }
}

/// Transforms report content JSON into format that can be
/// imported into Redux DevTools.
fn prepare_redux_devtools_import(
  mut error_report: HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value, serde_json::Error> {
  use serde_json::{json, map::Map, Value};

  let nav_state = error_report.remove("navState");
  let actions = error_report.remove("actions");
  let mut preloaded_state = error_report
    .remove("preloadedState")
    .unwrap_or_else(|| Value::Object(Map::new()));

  preloaded_state["navState"] = nav_state.into();
  preloaded_state["frozen"] = true.into();
  preloaded_state["_persist"]["rehydrated"] = false.into();

  let preload_state_str = serde_json::to_string(&preloaded_state)?;
  let payload_str = serde_json::to_string(&actions)?;

  Ok(json!({
    "preloadedState": preload_state_str,
    "payload": payload_str,
  }))
}
