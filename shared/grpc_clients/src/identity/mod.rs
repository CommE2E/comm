pub mod authenticated;
pub mod device;
pub mod shared;
pub mod unauthenticated;

pub mod protos {
  // This must be named client for authenticated generated code
  pub mod client {
    tonic::include_proto!("identity.client");
  }
  pub use client as unauthenticated;

  pub mod authenticated {
    tonic::include_proto!("identity.authenticated");
  }
}

pub use authenticated::get_auth_client;
pub use device::DeviceType;
pub use shared::{REQUEST_METADATA_COOKIE_KEY, RESPONSE_METADATA_COOKIE_KEY};
pub use unauthenticated::get_unauthenticated_client;
