use actix_web::{
  body::{EitherBody, MessageBody},
  dev::{Service, ServiceRequest, ServiceResponse, Transform},
  FromRequest, HttpMessage,
};
use actix_web_httpauth::{
  extractors::{bearer::BearerAuth, AuthenticationError},
  headers::www_authenticate::bearer::Bearer,
  middleware::HttpAuthentication,
};
use std::{
  future::{ready, Ready},
  str::FromStr,
};

use crate::auth::UserIdentity;

impl FromRequest for UserIdentity {
  type Error = actix_web::Error;
  type Future = Ready<Result<Self, Self::Error>>;

  fn from_request(
    req: &actix_web::HttpRequest,
    _: &mut actix_web::dev::Payload,
  ) -> Self::Future {
    if let Some(user) = req.extensions().get::<UserIdentity>() {
      return ready(Ok(user.clone()));
    }

    let f = || {
      let bearer = BearerAuth::extract(req).into_inner()?;
      let Ok(user) = UserIdentity::from_str(bearer.token()) else {
        return Err(AuthenticationError::new(Bearer::default()).into());
      };

      Ok(user)
    };

    ready(f())
  }
}

pub async fn validation_function(
  req: ServiceRequest,
  bearer: BearerAuth,
) -> Result<ServiceRequest, (actix_web::Error, ServiceRequest)> {
  let Ok(user) = UserIdentity::from_str(bearer.token()) else {
    return Err((AuthenticationError::new(Bearer::default()).into(), req));
  };

  // TODO: call identity service, for now just allow every request
  req.extensions_mut().insert(user);

  Ok(req)
}

/// Use this to add Authentication Middleware. It's going to parse Authorization
/// header and call the identity service to check if the provided credentials
/// are correct. If not it's going to reject the request.
///
/// # Example
/// ```ignore
/// let auth_middleware = get_comm_authentication_middleware();
/// App::new().wrap(auth_middleware);
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
