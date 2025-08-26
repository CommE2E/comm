use chrono::Utc;
use comm_lib::{
  auth::AuthorizationCredential,
  blob::client::{BlobServiceClient, BlobServiceError},
  crypto::aes256,
  database::{self, blob::BlobOrDBContent},
};
use derive_more::{Display, Error, From};
use std::{collections::HashMap, sync::Arc};
use tracing::{error, trace};

use crate::{
  config::CONFIG,
  database::{
    client::{DatabaseClient, ReportsPage},
    item::ReportItem,
  },
  email::{config::EmailConfig, ReportEmail},
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
  /// Error during encryption or decryption
  #[display(fmt = "Encryption error")]
  EncryptionError,
  /// Unexpected error
  Unexpected,
}

type ServiceResult<T> = Result<T, ReportsServiceError>;

#[derive(Clone)]
pub struct ReportsService {
  db: DatabaseClient,
  blob_client: BlobServiceClient,
  requesting_user_id: Option<String>,
  email_config: Option<Arc<EmailConfig>>,
}

impl ReportsService {
  pub fn new(
    db: DatabaseClient,
    blob_client: BlobServiceClient,
    email_config: Option<EmailConfig>,
  ) -> Self {
    Self {
      db,
      blob_client,
      requesting_user_id: None,
      email_config: email_config.map(Arc::new),
    }
  }

  /// Clones the service with a new auth identity. When the credential is
  /// a service-to-service, the `user_id` is None.
  pub fn with_authentication(&self, token: AuthorizationCredential) -> Self {
    let requesting_user_id = match &token {
      AuthorizationCredential::ServicesToken(_) => None,
      AuthorizationCredential::UserToken(user) => {
        Some(user.user_id.to_string())
      }
    };
    Self {
      db: self.db.clone(),
      email_config: self.email_config.clone(),
      blob_client: self.blob_client.with_authentication(token),
      requesting_user_id,
    }
  }

  pub async fn save_reports(
    &self,
    inputs: Vec<ReportInput>,
  ) -> ServiceResult<Vec<ReportID>> {
    let mut reports = Vec::with_capacity(inputs.len());
    let mut tasks = tokio::task::JoinSet::new();

    // 1. Concurrently prepare reports. Upload them to blob service if needed
    for input in inputs {
      let blob_client = self.blob_client.clone();
      let user_id = self.requesting_user_id.clone();
      tasks.spawn(async move {
        let mut report = process_report(input, user_id)?;
        report.db_item.ensure_size_constraints(&blob_client).await?;
        Ok(report)
      });
    }

    // 2. Wait for all uploads to complete and collect results
    // If any of them failed, abort
    while let Some(task) = tasks.join_next().await {
      let result: Result<_, ReportsServiceError> = task.map_err(|err| {
        error!("Task failed to join: {err}");
        ReportsServiceError::Unexpected
      })?;
      reports.push(result?);
    }

    let (ids, (db_items, emails)): (Vec<_>, (Vec<_>, Vec<_>)) = reports
      .into_iter()
      .map(|ProcessedReport { id, db_item, email }| (id, (db_item, email)))
      .unzip();

    // 3. Store the reports in database
    self.db.save_reports(db_items).await?;

    // 4. Send e-mails asynchronously
    tokio::spawn(async move {
      if let Err(err) = crate::email::send_emails(emails).await {
        error!("Failed to send e-mails: {err}");
      }
    });
    Ok(ids)
  }

  pub async fn get_report(
    &self,
    report_id: ReportID,
  ) -> ServiceResult<Option<ReportOutput>> {
    use ReportsServiceError::{EncryptionError, SerdeError};
    let Some(report_item) = self.db.get_report(&report_id).await? else {
      return Ok(None);
    };
    let ReportItem {
      user_id,
      report_type,
      platform,
      creation_time,
      content,
      encryption_key,
      ..
    } = report_item;

    let mut report_data = content.fetch_bytes(&self.blob_client).await?;
    if let Some(key) = encryption_key {
      trace!("Encryption key present. Decrypting report data");
      report_data = aes256::decrypt(&report_data, &key).map_err(|_| {
        error!("Failed to decrypt report");
        EncryptionError
      })?;
    }

    let report_json =
      serde_json::from_slice(report_data.as_slice()).map_err(SerdeError)?;

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
    page_size: Option<u32>,
  ) -> ServiceResult<ReportsPage> {
    let page = self.db.scan_reports(cursor, page_size).await?;
    Ok(page)
  }
}

struct ProcessedReport {
  id: ReportID,
  db_item: ReportItem,
  email: ReportEmail,
}

#[allow(clippy::result_large_err)]
fn process_report(
  input: ReportInput,
  user_id: Option<String>,
) -> Result<ProcessedReport, ReportsServiceError> {
  use ReportsServiceError::*;

  let id = ReportID::default();
  let email = crate::email::prepare_email(&input, &id, user_id.as_deref());

  let ReportInput {
    platform_details,
    report_type,
    time,
    mut report_content,
  } = input;

  // Add "platformDetails" back to report content.
  // It was deserialized into a separate field.
  let platform_details_value =
    serde_json::to_value(&platform_details).map_err(SerdeError)?;
  report_content.insert("platformDetails".to_string(), platform_details_value);

  // serialize report JSON to bytes
  let content_bytes =
    serde_json::to_vec(&report_content).map_err(SerdeError)?;

  // possibly encrypt report
  let (content, encryption_key) = if CONFIG.encrypt_reports {
    trace!(?id, "Encrypting report");
    let key = aes256::EncryptionKey::new();
    let data = aes256::encrypt(&content_bytes, &key).map_err(|_| {
      error!("Failed to encrypt report");
      EncryptionError
    })?;
    (data, Some(key))
  } else {
    (content_bytes, None)
  };

  let db_item = ReportItem {
    id: id.clone(),
    user_id: user_id.unwrap_or("[null]".to_string()),
    platform: platform_details.platform.clone(),
    report_type,
    creation_time: time.unwrap_or_else(Utc::now),
    encryption_key,
    content: BlobOrDBContent::new(content),
  };

  Ok(ProcessedReport { id, db_item, email })
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
