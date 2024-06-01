use http::Method;
use hyper::{Body, Request, Response};

mod errors;
type HttpRequest = Request<Body>;
type HttpResponse = Response<Body>;

type ErrorResponse = Result<HttpResponse, errors::BoxedError>;

/// Main router for HTTP requests
#[tracing::instrument(skip_all, name = "http_request", fields(request_id))]
pub(super) async fn handle_http_request(
  req: HttpRequest,
  db_client: crate::DatabaseClient,
) -> Result<HttpResponse, errors::BoxedError> {
  use utils::IntoServerResponse;

  tracing::Span::current()
    .record("request_id", uuid::Uuid::new_v4().to_string());

  match req.uri().path() {
    "/health" => Response::new(Body::from("OK")).into_response(),
    _ => errors::http404("Not found").into_response(),
  }
}
