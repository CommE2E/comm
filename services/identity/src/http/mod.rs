use hyper::{Body, Request, Response};

mod errors;

type HttpRequest = Request<Body>;
type HttpResponse = Response<Body>;

type ErrorResponse = Result<HttpResponse, errors::BoxedError>;

/// Main router for HTTP requests
#[tracing::instrument(skip_all, name = "http_request", fields(request_id))]
pub(super) async fn handle_http_request(
  req: HttpRequest,
  _db_client: crate::DatabaseClient,
) -> Result<HttpResponse, crate::websockets::errors::BoxedError> {
  tracing::Span::current()
    .record("request_id", uuid::Uuid::new_v4().to_string());

  let response = match req.uri().path() {
    "/health" => Response::new(Body::from("OK")),
    _ => errors::http404("Not found")?,
  };
  Ok(response)
}
