use crate::identity::delete_user_response::DeleteResult;
use crate::identity::identity_service_client::IdentityServiceClient;
use crate::identity::DeleteUserRequest;
use crate::IDENTITY_SERVICE_SOCKET_ADDR;
use napi::bindgen_prelude::{Error, Result, Status};
use tonic::Request;
use tracing::{error, instrument};

#[napi]
#[instrument(skip_all)]
pub async fn delete_user(user_id: String) -> Result<()> {
  let mut identity_client =
    IdentityServiceClient::connect(IDENTITY_SERVICE_SOCKET_ADDR.as_str())
      .await
      .map_err(|_| Error::from_status(Status::GenericFailure))?;

  let request = Request::new(DeleteUserRequest {
    user_id: user_id.clone(),
  });
  let response = identity_client
    .delete_user(request)
    .await
    .map_err(|_| Error::from_status(Status::GenericFailure))?
    .into_inner();

  match response.delete_result() {
    DeleteResult::Failure => {
      error!("Error while deleting user: {}", &user_id);
      Err(Error::from_status(Status::GenericFailure))
    }
    DeleteResult::Success => Ok(()),
  }
}
