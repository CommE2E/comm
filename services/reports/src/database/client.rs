use comm_services_lib::database::{
  self, batch_operations::ExponentialBackoffConfig,
};

use crate::report_types::ReportID;

use super::constants::*;
use super::item::ReportItem;

#[derive(serde::Serialize)]
pub struct ReportsPage {
  pub reports: Vec<ReportItem>,
  /// Report ID that can be used as a cursor to retrieve the next page
  #[serde(rename(serialize = "nextPage"))]
  pub last_evaluated_report: Option<ReportID>,
}

#[derive(Clone)]
pub struct DatabaseClient {
  ddb: aws_sdk_dynamodb::Client,
}

impl DatabaseClient {
  pub fn new(aws_config: &aws_config::SdkConfig) -> Self {
    DatabaseClient {
      ddb: aws_sdk_dynamodb::Client::new(aws_config),
    }
  }

  /// Gets a single [`ReportItem`] given its [`ReportID`]
  pub async fn get_report(
    &self,
    report_id: &ReportID,
  ) -> Result<Option<ReportItem>, database::Error> {
    let response = self
      .ddb
      .get_item()
      .table_name(TABLE_NAME)
      .key(ATTR_REPORT_ID, report_id.into())
      .send()
      .await
      .map_err(|err| database::Error::AwsSdk(err.into()))?;

    response
      .item
      .map(ReportItem::try_from)
      .transpose()
      .map_err(database::Error::from)
  }

  /// Saves multiple reports to DB in batch
  pub async fn save_reports(
    &self,
    reports: impl IntoIterator<Item = ReportItem>,
  ) -> Result<(), database::Error> {
    use aws_sdk_dynamodb::types::{PutRequest, WriteRequest};

    let requests = reports
      .into_iter()
      .map(|item| {
        let attrs = item.into_attrs();
        let put_request = PutRequest::builder().set_item(Some(attrs)).build();
        WriteRequest::builder().put_request(put_request).build()
      })
      .collect::<Vec<_>>();

    database::batch_operations::batch_write(
      &self.ddb,
      TABLE_NAME,
      requests,
      ExponentialBackoffConfig::default(),
    )
    .await
  }
}
