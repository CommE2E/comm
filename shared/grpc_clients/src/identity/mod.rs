pub mod authenticated;
pub mod device;
pub mod shared;
pub mod unauthenticated;

pub mod protos {
  // This must be named unauth for authenticated generated code
  pub mod unauth {
    tonic::include_proto!("identity.unauth");
  }
  pub use unauth as unauthenticated;

  pub mod authenticated {
    tonic::include_proto!("identity.authenticated");
  }
}

pub use authenticated::get_auth_client;
pub use device::DeviceType;
pub use shared::{REQUEST_METADATA_COOKIE_KEY, RESPONSE_METADATA_COOKIE_KEY};
pub use unauthenticated::get_unauthenticated_client;
