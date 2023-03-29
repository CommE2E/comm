use std::convert::Infallible;
use std::task::{Context, Poll};

use hyper::{Request, Response};
use tonic::body::BoxBody;
use tonic::codegen::Service;
use tonic::server::NamedService;
use tonic::transport::Body;

#[derive(Clone)]
pub struct NamedClientServiceWrapper<S>(S);
impl<S> NamedClientServiceWrapper<S> {
  pub fn new(service: S) -> Self {
    Self(service)
  }
}

impl<S> Service<Request<Body>> for NamedClientServiceWrapper<S>
where
  S: Service<Request<Body>, Response = Response<BoxBody>, Error = Infallible>
    + Clone
    + Send
    + 'static,
  S::Future: Send + 'static,
{
  type Response = S::Response;
  type Error = S::Error;
  type Future = S::Future;

  fn poll_ready(
    &mut self,
    cx: &mut Context<'_>,
  ) -> Poll<Result<(), Self::Error>> {
    self.0.poll_ready(cx)
  }

  fn call(&mut self, req: Request<Body>) -> Self::Future {
    self.0.call(req)
  }
}

impl<S> NamedService for NamedClientServiceWrapper<S> {
  const NAME: &'static str = "identity.client";
}
