use actix_web::FromRequest;
use comm_lib::auth::{
  is_csat_verification_disabled, AuthService, AuthorizationCredential,
};
use std::{future::Future, pin::Pin};
use tracing::{error, warn};

use crate::service::ReportsService;

impl FromRequest for ReportsService {
  type Error = actix_web::Error;
  type Future = Pin<Box<dyn Future<Output = Result<Self, actix_web::Error>>>>;

  #[inline]
  fn from_request(
    req: &actix_web::HttpRequest,
    payload: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    use actix_web::error::{ErrorForbidden, ErrorInternalServerError};

    let base_service =
      req.app_data::<ReportsService>().cloned().ok_or_else(|| {
        tracing::error!(
          "FATAL! Failed to extract ReportsService from actix app_data. \
      Check HTTP server configuration"
        );
        ErrorInternalServerError("Internal server error")
      });

    let auth_service = AuthService::from_request(req, payload).into_inner();
    let request_auth_value =
      AuthorizationCredential::from_request(req, payload).into_inner();

    Box::pin(async move {
      let auth_service = auth_service?;
      let base_service = base_service?;

      let credential = request_auth_value.ok();

      // This is Some if the request contains valid Authorization header
      let auth_token = match credential {
        Some(token @ AuthorizationCredential::UserToken(_)) => {
          let token_valid = auth_service
            .verify_auth_credential(&token)
            .await
            .map_err(|err| {
            error!("Failed to verify access token: {err}");
            ErrorInternalServerError("Internal server error")
          })?;
          if token_valid || is_csat_verification_disabled() {
            token
          } else {
            warn!("Posting report with invalid credentials! Defaulting to ServicesToken...");
            get_services_token_credential(&auth_service).await?
          }
        }
        Some(_) => {
          // Reports service shouldn't be called by other services
          warn!("Reports service requires user authorization");
          return Err(ErrorForbidden("Forbidden"));
        }
        None => {
          // Unauthenticated requests get a service-to-service token
          get_services_token_credential(&auth_service).await?
        }
      };
      let service = base_service.with_authentication(auth_token);
      Ok(service)
    })
  }
}

async fn get_services_token_credential(
  auth_service: &AuthService,
) -> Result<AuthorizationCredential, actix_web::Error> {
  let services_token =
    auth_service.get_services_token().await.map_err(|err| {
      error!("Failed to get services token: {err}");
      actix_web::error::ErrorInternalServerError("Internal server error")
    })?;
  Ok(AuthorizationCredential::ServicesToken(services_token))
}
