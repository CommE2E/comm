use actix_web::{
  body::{EitherBody, MessageBody},
  dev::{Service, ServiceRequest, ServiceResponse, Transform},
  error::ErrorInternalServerError,
  FromRequest, HttpMessage,
};
use actix_web_httpauth::{
  extractors::{bearer::BearerAuth, AuthenticationError},
  headers::www_authenticate::bearer::Bearer,
  middleware::HttpAuthentication,
};
use http::StatusCode;
use std::{
  boxed::Box,
  future::{ready, Future, Ready},
  pin::Pin,
  str::FromStr,
};
use tracing::{debug, error, trace};

use crate::auth::{AuthService, AuthorizationCredential, UserIdentity};

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
  type Future = Pin<Box<dyn Future<Output = Result<Self, Self::Error>>>>;

  fn from_request(
    req: &actix_web::HttpRequest,
    payload: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    // NOTE: If ever `Ready<T>.into_inner()` gets stable, we can use it here
    // to get rid of the async block. Feature name: "ready_into_inner".
    // Tracking issue: https://github.com/rust-lang/rust/issues/101196
    let credential_fut = AuthorizationCredential::from_request(req, payload);
    let fut = async move {
      match credential_fut.await {
        Ok(AuthorizationCredential::UserToken(user)) => Ok(user.clone()),
        Ok(_) => {
          debug!("Authorization provided, but it's not UserIdentity");
          let mut error = AuthenticationError::new(Bearer::default());
          *error.status_code_mut() = StatusCode::FORBIDDEN;
          Err(error.into())
        }
        Err(err) => Err(err),
      }
    };
    Box::pin(fut)
  }
}

pub async fn validation_function(
  req: ServiceRequest,
  bearer: BearerAuth,
) -> Result<ServiceRequest, (actix_web::Error, ServiceRequest)> {
  let credential = match AuthorizationCredential::from_str(bearer.token()) {
    Ok(credential) => credential,
    Err(err) => {
      debug!("HTTP authorization error: {err}");
      return Err((AuthenticationError::new(Bearer::default()).into(), req));
    }
  };

  let auth_service = req
    .app_data::<AuthService>()
    .expect("FATAL: missing AuthService app data. Check HTTP server config.");

  match auth_service.verify_auth_credential(&credential).await {
    Ok(true) => trace!("Request is authenticated with {credential}"),
    Ok(false) => {
      // TODO: Return 401 here when we're ready to reject unauthenticated requests
      trace!("Request is not authenticated. Token: {credential:?}");
    }
    Err(err) => {
      error!("Error verifying auth credential: {err}");
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
> + 'static
where
  B: MessageBody + 'static,
  S: Service<
      ServiceRequest,
      Response = ServiceResponse<B>,
      Error = actix_web::Error,
    > + 'static,
{
  HttpAuthentication::bearer(validation_function)
}
