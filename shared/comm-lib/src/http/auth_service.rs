use std::any::type_name;
use std::pin::Pin;
use std::{future::Future, ops::Deref};

use actix_web::HttpRequest;
use actix_web::{
  error::{ErrorForbidden, ErrorInternalServerError},
  web, FromRequest,
};
use tracing::{error, warn};

use crate::auth::{
  is_csat_verification_disabled, AuthService, AuthorizationCredential,
};

/// Service that can be stored in HTTP server app data: `App::app_data()`
/// and requires request authentication to work. The app data
/// should contain the default (unauthenticated) instance of the service.
/// The service is cloned with each request and fed with authentication token.
///
/// Services of this type can be retrieved in request handlers
/// with the `Authenticated<SomeService>` extractor. See ['Authenticated']
/// for more details.
pub trait HttpAuthenticatedService: Clone {
  /// Supplies base (unauthenticated) service with [`AuthorizationCredential`]
  /// and returns new authenticated instance.
  fn make_authenticated(self, auth_credential: AuthorizationCredential)
    -> Self;

  /// Whether service should accept requests authenticated with
  /// a service-to-service token (callable by other services).
  /// If false, service can only be called with `UserIdentity` token.
  fn accepts_services_token() -> bool {
    false
  }

  /// If the service should fall back to service-to-service token,
  /// when user credentials are invalid. Default is `true`.
  /// If you want to fail requests, prefer hiding endpoints behind
  /// [`super::auth::get_comm_authentication_middleware()`] instead.
  fn fallback_to_services_token() -> bool {
    true
  }
}

/// Extractor for services that require HTTP authentication to work.
/// If the endpoint is authenticated, given `UserIdentity` credential is
/// passed to the service. For unauthenticated endpoints, a service-to-service
/// token is retrieved.
///
/// Note that this does not require make the endpoint authenticated.
/// It only supplies authorization credential to the wrapped service.
///
/// Wrapped service must be specified in HTTP app data (`App::app_data()`),
/// either directly (recommended if it implements [`FromRequest`])
/// or via [`web::Data`].
///
/// # Example
/// ```ignore
/// pub async fn request_handler(
///  some_service: Authenticated<SomeService>,
/// ) -> Result<HttpResponse> {
///   Ok(HttpResponse::Ok().finish())
/// }
/// ```
#[derive(Clone)]
pub struct Authenticated<S: HttpAuthenticatedService> {
  inner: S,
}

impl<S: HttpAuthenticatedService> Authenticated<S> {
  /// Retrieves inner authenticated service
  pub fn into_inner(self) -> S {
    self.inner
  }
}

impl<S: HttpAuthenticatedService> Deref for Authenticated<S> {
  type Target = S;
  fn deref(&self) -> &Self::Target {
    &self.inner
  }
}

impl<S: HttpAuthenticatedService> AsRef<S> for Authenticated<S>
where
  <Authenticated<S> as Deref>::Target: AsRef<S>,
{
  fn as_ref(&self) -> &S {
    self.deref()
  }
}

impl<S: HttpAuthenticatedService + 'static> FromRequest for Authenticated<S> {
  type Error = actix_web::Error;
  type Future = Pin<Box<dyn Future<Output = Result<Self, Self::Error>>>>;

  fn from_request(
    req: &HttpRequest,
    payload: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    let base_service = req
      .app_data::<S>()
      .or_else(|| {
        // fallback to web::Data for compatibility with existing code
        req.app_data::<web::Data<S>>().map(|it| it.as_ref())
      })
      .cloned()
      .ok_or_else(|| {
        tracing::error!(
          "FATAL! Failed to extract `{}` from actix `App::app_data()`. \
      Check HTTP server configuration!",
          type_name::<S>()
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

          match token_valid {
            true => token,
            false if is_csat_verification_disabled() => token,
            false if S::fallback_to_services_token() => {
              warn!(
                "Got {1} request with invalid credentials! {0}",
                "Defaulting to ServicesToken...",
                type_name::<S>()
              );
              get_services_token_credential(&auth_service).await?
            }
            false => {
              return Err(ErrorForbidden("invalid credentials"));
            }
          }
        }
        Some(token @ AuthorizationCredential::ServicesToken(_)) => {
          if S::accepts_services_token() {
            token
          } else {
            // This service shouldn't be called by other services
            warn!("{} requests requires user authorization", type_name::<S>());
            return Err(ErrorForbidden("Forbidden"));
          }
        }
        None => {
          // Unauthenticated requests get a service-to-service token
          get_services_token_credential(&auth_service).await?
        }
      };
      let service = base_service.make_authenticated(auth_token);
      Ok(Authenticated { inner: service })
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
