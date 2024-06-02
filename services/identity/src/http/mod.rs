use hyper::{Body, Method, Request, Response};

mod errors;
mod handlers;
mod utils;

type HttpRequest = Request<Body>;
type HttpResponse = Response<Body>;

type ErrorResponse = Result<HttpResponse, errors::BoxedError>;

/// Main router for HTTP requests
#[tracing::instrument(skip_all, name = "http_request", fields(request_id))]
pub(super) async fn handle_http_request(
  req: HttpRequest,
  db_client: crate::DatabaseClient,
) -> Result<HttpResponse, crate::websockets::errors::BoxedError> {
  use utils::IntoServerResponse;

  tracing::Span::current()
    .record("request_id", uuid::Uuid::new_v4().to_string());

  let response = match req.uri().path() {
    "/health" => Response::new(Body::from("OK")),
    "/device_inbound_keys" => match req.method() {
      &Method::GET => handlers::inbound_keys_handler(req, db_client)
        .await
        .into_response()?,
      _ => errors::http405()?,
    },
    _ => errors::http404("Not found")?,
  };

  Ok(response)
}
