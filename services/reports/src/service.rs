use actix_web::FromRequest;
use comm_services_lib::{auth::UserIdentity, blob::client::BlobServiceClient};
use std::future::{ready, Ready};

use crate::database::client::DatabaseClient;
#[derive(Clone)]
pub struct ReportsService {
  db: DatabaseClient,
  blob_client: BlobServiceClient,
  requesting_user_id: Option<String>,
}

impl ReportsService {
  pub fn new(db: DatabaseClient, blob_client: BlobServiceClient) -> Self {
    Self {
      db,
      blob_client,
      requesting_user_id: None,
    }
  }

  pub fn authenticated(&self, user: UserIdentity) -> Self {
    let user_id = user.user_id.to_string();
    Self {
      db: self.db.clone(),
      blob_client: self.blob_client.with_user_identity(user),
      requesting_user_id: Some(user_id),
    }
  }
}

impl FromRequest for ReportsService {
  type Error = actix_web::Error;
  type Future = Ready<Result<Self, actix_web::Error>>;

  #[inline]
  fn from_request(
    req: &actix_web::HttpRequest,
    _payload: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    use actix_web::HttpMessage;

    let Some(service) = req.app_data::<ReportsService>() else {
      tracing::error!(
        "FATAL! Failed to extract ReportsService from actix app_data. \
        Check HTTP server configuration"
      );
      return ready(Err(actix_web::error::ErrorInternalServerError("Internal server error")));
    };

    let auth_service =
      if let Some(user_identity) = req.extensions().get::<UserIdentity>() {
        tracing::trace!("Found user identity. Creating authenticated service");
        service.authenticated(user_identity.clone())
      } else {
        tracing::trace!(
          "No user identity found. Leaving unauthenticated service"
        );
        service.clone()
      };

    ready(Ok(auth_service))
  }
}
