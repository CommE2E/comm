use actix_web::error::ErrorBadRequest;
use actix_web::{web, HttpResponse};
use comm_lib::blob::types::http::{
  AssignHoldersRequest, AssignHoldersResponse, BlobInfo,
  HolderAssignmentResult, RemoveHoldersRequest, RemoveHoldersResponse,
};
use tracing::{info, instrument, trace, warn};

use crate::service::BlobService;

#[instrument(name = "assign_multiple_holders", skip_all)]
pub async fn assign_holders_handler(
  service: web::Data<BlobService>,
  payload: web::Json<AssignHoldersRequest>,
) -> actix_web::Result<HttpResponse> {
  use crate::database::DBError;
  use crate::service::BlobServiceError;

  let AssignHoldersRequest { requests } = payload.into_inner();
  info!("Assign holder request for {} holders", requests.len());
  validate_request(&requests)?;

  let blob_hashes = requests.iter().map(|it| &it.blob_hash).collect();
  let existing_blobs = service.find_existing_blobs(blob_hashes).await?;
  let mut results = Vec::with_capacity(requests.len());
  for item in requests {
    let BlobInfo { blob_hash, holder } = &item;
    let data_exists = existing_blobs.contains(blob_hash);
    let result = match service.assign_holder(blob_hash, holder).await {
      Ok(()) => HolderAssignmentResult {
        request: item,
        success: true,
        data_exists,
        holder_already_exists: false,
      },
      Err(BlobServiceError::DB(DBError::ItemAlreadyExists)) => {
        HolderAssignmentResult {
          request: item,
          success: true,
          data_exists,
          holder_already_exists: true,
        }
      }
      Err(err) => {
        warn!("Holder assignment error: {:?}", err);
        HolderAssignmentResult {
          request: item,
          success: false,
          data_exists,
          holder_already_exists: false,
        }
      }
    };
    results.push(result);
  }

  let response = AssignHoldersResponse { results };
  Ok(HttpResponse::Ok().json(web::Json(response)))
}

#[instrument(name = "remove_multiple_holders", skip_all)]
pub async fn remove_holders_handler(
  service: web::Data<BlobService>,
  payload: web::Json<RemoveHoldersRequest>,
) -> actix_web::Result<HttpResponse> {
  let (requests, instant_delete) = match payload.into_inner() {
    RemoveHoldersRequest::Items {
      requests,
      instant_delete,
    } => (requests, instant_delete),
    RemoveHoldersRequest::ByIndexedTags { tags } => {
      tracing::debug!("Querying holders for {} tags", tags.len());
      let requests = service.query_holders_by_tags(tags).await?;
      (requests, false)
    }
  };
  info!(
    instant_delete,
    "Requested removal of {} holders.",
    requests.len()
  );
  validate_request(&requests)?;

  let mut failed_requests = Vec::new();
  // This has to be done sequentially because `service.revoke_holder()`
  // performs a DDB transaction and these transactions could conflict
  // with each other, e.g. if two holders were removed for the same blob hash.
  for item in requests {
    trace!("Removing item: {:?}", &item);

    let BlobInfo { holder, blob_hash } = &item;
    if let Err(err) = service
      .revoke_holder(blob_hash, holder, instant_delete)
      .await
    {
      warn!("Holder removal failed: {:?}", err);
      failed_requests.push(item);
    }
  }
  let response = RemoveHoldersResponse { failed_requests };
  Ok(HttpResponse::Ok().json(web::Json(response)))
}

/**
 * Returns `HTTP 400 Bad Request` if one or more blob hashes or holders
 * have invalid format. See [`comm_lib::tools::is_valid_identifier`] for
 * valid format conditions
 */
fn validate_request(items: &[BlobInfo]) -> actix_web::Result<()> {
  use comm_lib::tools::is_valid_identifier;
  let all_valid = items.iter().all(|BlobInfo { holder, blob_hash }| {
    is_valid_identifier(holder) && is_valid_identifier(blob_hash)
  });

  if !all_valid {
    return Err(ErrorBadRequest("One or more requests have invalid format"));
  }

  Ok(())
}
