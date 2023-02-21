use tonic::{metadata::MetadataValue, Request, Status};
use tracing::error;

use crate::config::CONFIG;

pub fn check_auth(req: Request<()>) -> Result<Request<()>, Status> {
  let token: MetadataValue<_> =
    CONFIG.keyserver_auth_token.parse().map_err(|e| {
      error!("Invalid auth token on server: {}", e);
      Status::failed_precondition("internal error")
    })?;

  match req.metadata().get("authorization") {
    Some(t) if token == t => Ok(req),
    _ => Err(Status::unauthenticated("No valid auth token")),
  }
}
