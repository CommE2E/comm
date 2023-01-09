use tonic::Status;

use super::proto;
use crate::database::DatabaseClient;

pub async fn handle_add_attachments(
  db: &DatabaseClient,
  request: proto::AddAttachmentsRequest,
) -> Result<(), Status> {
  unimplemented!()
}
