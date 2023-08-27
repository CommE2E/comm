use aws_sdk_dynamodb::types::AttributeValue;
use comm_services_lib::database::{
  self, batch_operations::ExponentialBackoffConfig,
};

use crate::constants::REPORT_LIST_DEFAULT_PAGE_SIZE;
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

  /// Performs a scan operation to get reports, returns 20 items and a cursor
  /// that can be used to get next 20 items
  pub async fn scan_reports(
    &self,
    cusror: Option<String>,
    page_size: Option<u32>,
  ) -> Result<ReportsPage, database::Error> {
    let query = self
      .ddb
      .scan()
      .table_name(TABLE_NAME)
      .limit(page_size.unwrap_or(REPORT_LIST_DEFAULT_PAGE_SIZE) as i32);

    let request = if let Some(last_evaluated_item) = cusror {
      query.exclusive_start_key(
        ATTR_REPORT_ID,
        AttributeValue::S(last_evaluated_item),
      )
    } else {
      query
    };

    let output = request
      .send()
      .await
      .map_err(|err| database::Error::AwsSdk(err.into()))?;

    let last_evaluated_report = output
      .last_evaluated_key
      .map(|mut attrs| ReportID::try_from(attrs.remove(ATTR_REPORT_ID)))
      .transpose()?;

    let Some(items) = output.items else {
      return Ok(ReportsPage {
        reports: Vec::new(),
        last_evaluated_report,
      });
    };

    let reports = items
      .into_iter()
      .map(ReportItem::try_from)
      .collect::<Result<Vec<_>, _>>()?;

    Ok(ReportsPage {
      reports,
      last_evaluated_report,
    })
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
