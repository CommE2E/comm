pub mod identity_client;
pub mod identity {
  tonic::include_proto!("identity");
}

#[macro_use]
extern crate napi_derive;

use lazy_static::lazy_static;
use std::env::var;

lazy_static! {
  pub static ref IDENTITY_SERVICE_SOCKET_ADDR: String =
    var("COMM_IDENTITY_SERVICE_SOCKET_ADDR")
      .unwrap_or("https://[::1]:50051".to_string());
}
