use actix_web::error::ErrorBadRequest;
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use tracing::{info, instrument, trace, warn};

use crate::service::BlobService;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BlobHashAndHolder {
  blob_hash: String,
  holder: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RemoveHoldersPayload {
  requests: Vec<BlobHashAndHolder>,
  #[serde(default)]
  instant_delete: bool,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RemoveHoldersResponse {
  failed_requests: Vec<BlobHashAndHolder>,
}

#[instrument(name = "remove_multiple_holders", skip(service))]
pub async fn remove_holders_handler(
  service: web::Data<BlobService>,
  payload: web::Json<RemoveHoldersPayload>,
) -> actix_web::Result<HttpResponse> {
  let RemoveHoldersPayload {
    requests,
    instant_delete,
  } = payload.into_inner();
  info!(
    instant_delete,
    "Remove request for {} holders.",
    requests.len()
  );
  validate_request(&requests)?;

  let mut failed_requests = Vec::new();
  // This has to be done sequentially because `service.revoke_holder()`
  // performs a DDB transaction and these transactions could conflict
  // with each other, e.g. if two holders were removed for the same blob hash.
  for item in requests {
    trace!("Removing item: {:?}", &item);

    let BlobHashAndHolder { holder, blob_hash } = &item;
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
fn validate_request(items: &[BlobHashAndHolder]) -> actix_web::Result<()> {
  use comm_lib::tools::is_valid_identifier;
  let all_valid =
    items.iter().all(|BlobHashAndHolder { holder, blob_hash }| {
      is_valid_identifier(holder) && is_valid_identifier(blob_hash)
    });

  if !all_valid {
    return Err(ErrorBadRequest("One or more requests have invalid format"));
  }

  Ok(())
}
