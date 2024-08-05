use actix_web::{
  error::ErrorForbidden,
  web::{self},
  HttpResponse,
};
use comm_lib::{
  auth::AuthorizationCredential, blob::client::BlobServiceClient,
  http::auth_service::Authenticated,
};
use tracing::{info, instrument};

use crate::{database::DatabaseClient, error::BackupError};

#[instrument(skip_all, fields(backup_id = %path))]
pub async fn delete_user_data(
  requesting_identity: AuthorizationCredential,
  path: web::Path<String>,
  db_client: web::Data<DatabaseClient>,
  blob_client: Authenticated<BlobServiceClient>,
) -> actix_web::Result<HttpResponse> {
  match requesting_identity {
    AuthorizationCredential::ServicesToken(_) => (),
    _ => {
      return Err(ErrorForbidden(
        "This endpoint can only be called by other services",
      ));
    }
  };

  info!("Delete user data request");
  let user_id = path.into_inner();
  db_client
    .delete_user_data(&user_id, &blob_client)
    .await
    .map_err(BackupError::from)?;

  Ok(HttpResponse::NoContent().finish())
}
