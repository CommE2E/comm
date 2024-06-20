use comm_lib::{
  auth::AuthorizationCredential, http::auth_service::HttpAuthenticatedService,
};

use crate::service::ReportsService;

impl HttpAuthenticatedService for ReportsService {
  fn make_authenticated(
    self,
    auth_credential: AuthorizationCredential,
  ) -> Self {
    self.with_authentication(auth_credential)
  }
}
