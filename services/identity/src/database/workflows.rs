use std::collections::HashMap;

use chrono::{Duration, Utc};
use comm_lib::{aws::ddb::types::AttributeValue, database::TryFromAttribute};

use super::DatabaseClient;
use crate::{
  client_service::WorkflowInProgress,
  constants::{
    WORKFLOWS_IN_PROGRESS_PARTITION_KEY, WORKFLOWS_IN_PROGRESS_TABLE,
    WORKFLOWS_IN_PROGRESS_TABLE_EXPIRATION_TIME_UNIX_ATTRIBUTE,
    WORKFLOWS_IN_PROGRESS_TTL_DURATION,
    WORKFLOWS_IN_PROGRESS_WORKFLOW_ATTRIBUTE,
  },
  error::Error,
  id::generate_uuid,
};

type WorkflowID = String;

impl DatabaseClient {
  pub async fn insert_workflow(
    &self,
    workflow: WorkflowInProgress,
  ) -> Result<WorkflowID, Error> {
    let workflow_id = generate_uuid();
    let workflow_expiration_time =
      Utc::now() + Duration::seconds(WORKFLOWS_IN_PROGRESS_TTL_DURATION);
    let item = HashMap::from([
      (
        WORKFLOWS_IN_PROGRESS_PARTITION_KEY.to_string(),
        AttributeValue::S(workflow_id.clone()),
      ),
      (
        WORKFLOWS_IN_PROGRESS_WORKFLOW_ATTRIBUTE.to_string(),
        AttributeValue::S(serde_json::to_string(&workflow)?),
      ),
      (
        WORKFLOWS_IN_PROGRESS_TABLE_EXPIRATION_TIME_UNIX_ATTRIBUTE.to_string(),
        AttributeValue::N(workflow_expiration_time.timestamp().to_string()),
      ),
    ]);
    self
      .client
      .put_item()
      .table_name(WORKFLOWS_IN_PROGRESS_TABLE)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    Ok(workflow_id)
  }

  pub async fn get_workflow(
    &self,
    workflow_id: String,
  ) -> Result<Option<WorkflowInProgress>, Error> {
    let get_response = self
      .client
      .get_item()
      .table_name(WORKFLOWS_IN_PROGRESS_TABLE)
      .key(
        WORKFLOWS_IN_PROGRESS_PARTITION_KEY,
        AttributeValue::S(workflow_id),
      )
      .send()
      .await
      .map_err(|e| Error::AwsSdk(e.into()))?;

    let mut workflow_item = get_response.item.unwrap_or_default();
    let raw_workflow =
      workflow_item.remove(WORKFLOWS_IN_PROGRESS_WORKFLOW_ATTRIBUTE);

    if raw_workflow.is_none() {
      return Ok(None);
    }

    let serialized_workflow = String::try_from_attr(
      WORKFLOWS_IN_PROGRESS_WORKFLOW_ATTRIBUTE,
      raw_workflow,
    )?;

    let workflow = serde_json::from_str(&serialized_workflow)?;

    Ok(Some(workflow))
  }
}
