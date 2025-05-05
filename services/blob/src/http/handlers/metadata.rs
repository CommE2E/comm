use crate::{http::utils::verify_caller_is_service, service::BlobService};
use actix_web::{web, HttpResponse};
use comm_lib::{
  auth::AuthorizationCredential,
  blob::types::http::{BlobSizesRequest, BlobSizesResponse},
};
use tracing::instrument;

#[instrument(name = "get_blob_size", skip_all)]
pub async fn get_blob_size(
  service: web::Data<BlobService>,
  payload: web::Json<BlobSizesRequest>,
  requesting_identity: AuthorizationCredential,
) -> actix_web::Result<HttpResponse> {
  verify_caller_is_service(&requesting_identity)?;

  let request = payload.into_inner();
  let blob_hashes = request.blob_hashes.into_iter().collect();
  let blob_sizes = service.query_blob_sizes(blob_hashes).await?;
  let response = BlobSizesResponse { blob_sizes };
  Ok(HttpResponse::Ok().json(response))
}
