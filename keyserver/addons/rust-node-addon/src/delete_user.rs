use crate::identity::identity_service_client::IdentityServiceClient;
use crate::identity::DeleteUserRequest;
use crate::IDENTITY_SERVICE_SOCKET_ADDR;
use napi::bindgen_prelude::{Error, Result, Status};
use tonic::Request;
use tracing::instrument;

#[napi]
#[instrument(skip_all)]
pub async fn delete_user(user_id: String) -> Result<()> {
  let mut identity_client =
    IdentityServiceClient::connect(IDENTITY_SERVICE_SOCKET_ADDR.as_str())
      .await
      .map_err(|_| {
        Error::new(
          Status::GenericFailure,
          "Unable to connect to identity service".to_string(),
        )
      })?;

  let request = Request::new(DeleteUserRequest {
    user_id: user_id.clone(),
  });
  identity_client
    .delete_user(request)
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;

  Ok(())
}
