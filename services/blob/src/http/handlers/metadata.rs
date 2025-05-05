use crate::{http::utils::verify_caller_is_service, service::BlobService};
use actix_web::{web, HttpResponse};
use comm_lib::{
  auth::AuthorizationCredential, blob::types::http::BlobSizesRequest,
};
use tracing::instrument;

#[instrument(name = "get_blob_sizes", skip_all)]
pub async fn get_blob_sizes(
  service: web::Data<BlobService>,
  payload: web::Json<BlobSizesRequest>,
  requesting_identity: AuthorizationCredential,
) -> actix_web::Result<HttpResponse> {
  verify_caller_is_service(&requesting_identity)?;

  Ok(HttpResponse::NotImplemented().body("Not implemented yet"))
}
