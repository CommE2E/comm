use actix_web::{
  body::{EitherBody, MessageBody},
  dev::{Service, ServiceRequest, ServiceResponse, Transform},
  error::{ErrorForbidden, ErrorInternalServerError},
  FromRequest, HttpMessage,
};
use actix_web_httpauth::{
  extractors::{bearer::BearerAuth, AuthenticationError},
  headers::www_authenticate::bearer::Bearer,
  middleware::HttpAuthentication,
};
use futures_util::future::{ready, Ready};
use http::StatusCode;
use std::str::FromStr;
use tracing::debug;

use crate::auth::{
  is_csat_verification_disabled, AuthService, AuthorizationCredential,
  UserIdentity,
};

impl FromRequest for AuthService {
  type Error = actix_web::Error;
  type Future = Ready<Result<Self, Self::Error>>;

  fn from_request(
    req: &actix_web::HttpRequest,
    _: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    let auth_service =
      req.app_data::<AuthService>().cloned().ok_or_else(|| {
        tracing::error!(
          "FATAL! Failed to get AuthService from request for `{}` handler.
          Check HTTP server config - make sure it's passed to App::app_data().",
          req.match_name().unwrap_or_else(|| req.path())
        );
        ErrorInternalServerError("internal error")
      });
    ready(auth_service)
  }
}

impl FromRequest for AuthorizationCredential {
  type Error = actix_web::Error;
  type Future = Ready<Result<Self, Self::Error>>;

  fn from_request(
    req: &actix_web::HttpRequest,
    _: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    if let Some(credential) = req.extensions().get::<AuthorizationCredential>()
    {
      return ready(Ok(credential.clone()));
    }

    let f = || {
      let bearer = BearerAuth::extract(req).into_inner()?;
      let credential = match AuthorizationCredential::from_str(bearer.token()) {
        Ok(credential) => credential,
        Err(err) => {
          debug!("HTTP authorization error: {err}");
          return Err(AuthenticationError::new(Bearer::default()).into());
        }
      };

      Ok(credential)
    };

    ready(f())
  }
}

impl FromRequest for UserIdentity {
  type Error = actix_web::Error;
  type Future = Ready<Result<Self, Self::Error>>;

  fn from_request(
    req: &actix_web::HttpRequest,
    payload: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    use futures_util::future::{err, ok};
    match AuthorizationCredential::from_request(req, payload).into_inner() {
      Ok(AuthorizationCredential::UserToken(user)) => ok(user.clone()),
      Ok(_) => {
        debug!("Authorization provided, but it's not UserIdentity");
        let mut error = AuthenticationError::new(Bearer::default());
        *error.status_code_mut() = StatusCode::FORBIDDEN;
        err(error.into())
      }
      Err(e) => err(e),
    }
  }
}

/// Counterpart of [`actix_web_httpauth::extractors::bearer::BearerAuth`] that
/// handles parsing Authorization header into [`AuthorizationCredential`].
/// The value can be `None` when CSAT verification is disabled.
#[derive(Clone, Debug)]
struct CommServicesBearerAuth {
  credential: Option<AuthorizationCredential>,
}

impl FromRequest for CommServicesBearerAuth {
  type Error = actix_web::Error;
  type Future = Ready<Result<Self, Self::Error>>;

  fn from_request(
    req: &actix_web::HttpRequest,
    _payload: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    use futures_util::future::{err, ok};
    if is_csat_verification_disabled() {
      return ok(Self { credential: None });
    }

    match AuthorizationCredential::extract(req).into_inner() {
      Ok(credential) => ok(Self {
        credential: Some(credential),
      }),
      Err(e) => err(e),
    }
  }
}

/// Function used by auth middleware to validate authenticated requests.
async fn middleware_validation_function(
  req: ServiceRequest,
  auth: CommServicesBearerAuth,
) -> Result<ServiceRequest, (actix_web::Error, ServiceRequest)> {
  let Some(credential) = auth.credential else {
    return if is_csat_verification_disabled() {
      Ok(req)
    } else {
      // This branch should be normally unreachable. If this happens,
      // it means that `MiddlewareCredentialExtractor::from_request()`
      // implementation is incorrect.
      tracing::error!(
        "CSAT verification enabled, but no credential was extracted!"
      );
      let mut error = AuthenticationError::new(Bearer::default());
      *error.status_code_mut() = StatusCode::INTERNAL_SERVER_ERROR;
      Err((error.into(), req))
    };
  };

  let auth_service = req
    .app_data::<AuthService>()
    .expect("FATAL: missing AuthService app data. Check HTTP server config.");
  match auth_service.verify_auth_credential(&credential).await {
    Ok(true) => tracing::trace!("Request is authenticated with {credential}"),
    Ok(false) => {
      tracing::trace!("Request is not authenticated. Token: {credential:?}");
      // allow for invalid tokens if verification is disabled
      if !is_csat_verification_disabled() {
        return Err((ErrorForbidden("invalid credentials"), req));
      }
    }
    Err(err) => {
      tracing::error!("Error verifying auth credential: {err}");
      return Err((ErrorInternalServerError("internal error"), req));
    }
  };

  req.extensions_mut().insert(credential);
  Ok(req)
}

/// Use this to add Authentication Middleware. It's going to parse Authorization
/// header and call the identity service to check if the provided credentials
/// are correct. If not it's going to reject the request.
/// Note that this requires `AuthService` to be present in the app data.
///
/// # Example
/// ```ignore
/// let auth_service = AuthService::new(&aws_config, &config.identity_endpoint);
/// let auth_middleware = get_comm_authentication_middleware();
/// App::new()
///   .app_data(auth_service.clone())
///   .wrap(auth_middleware)
/// ```
/// If you don't want all of the routes to require authentication you can wrap
/// individual resources or scopes:
/// ```ignore
/// App::new().service(
///  web::resource("/endpoint").route(web::get().to(handler)).wrap(auth_middleware),
/// )
/// ```
// This type is very complicated, but unfortunately typing this directly
// requires https://github.com/rust-lang/rust/issues/99697 to be merged.
// The issue is that we can't specify the second generic argument of
// HttpAuthentication<T, F>, because it look something like this:
// ```
// impl Fn(ServiceRequest, BearerAuth) -> impl Future<
//    Output = Result<ServiceRequest, (actix_web::Error, ServiceRequest)>,
//  >
// ``
// which isn't valid (until the linked issue is merged).
pub fn get_comm_authentication_middleware<B, S>() -> impl Transform<
  S,
  ServiceRequest,
  Response = ServiceResponse<EitherBody<B>>,
  Error = actix_web::Error,
  InitError = (),
> + Clone
     + 'static
where
  B: MessageBody + 'static,
  S: Service<
      ServiceRequest,
      Response = ServiceResponse<B>,
      Error = actix_web::Error,
    > + 'static,
{
  HttpAuthentication::with_fn(middleware_validation_function)
}
