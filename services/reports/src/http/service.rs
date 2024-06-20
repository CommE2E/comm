use actix_web::FromRequest;
use comm_lib::{
  auth::AuthorizationCredential,
  http::auth_service::{Authenticated, HttpAuthenticatedService},
};
use std::{future::Future, pin::Pin};

use crate::service::ReportsService;

impl HttpAuthenticatedService for ReportsService {
  fn make_authenticated(
    self,
    auth_credential: AuthorizationCredential,
  ) -> Self {
    self.with_authentication(auth_credential)
  }
}

// helper implementation to let use `ReportsService` directly in handlers,
// without having to use `Authenticated<ReportsService>` extractor
impl FromRequest for ReportsService {
  type Error = actix_web::Error;
  type Future = Pin<Box<dyn Future<Output = Result<Self, actix_web::Error>>>>;

  #[inline]
  fn from_request(
    req: &actix_web::HttpRequest,
    payload: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    let service_future =
      Authenticated::<ReportsService>::from_request(req, payload);

    Box::pin(async move {
      let service = service_future.await?;
      Ok(service.into_inner())
    })
  }
}
