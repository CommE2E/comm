pub mod authenticated;
pub mod device;
pub mod shared;
pub mod unauthenticated;

pub mod protos {
  // This must be named unauth for authenticated generated code
  pub mod unauth {
    tonic::include_proto!("identity.unauth");
  }
  pub mod auth {
    tonic::include_proto!("identity.auth");
  }
  pub use auth as authenticated;
  pub use unauth as unauthenticated;
}

pub use authenticated::get_auth_client;
pub use device::DeviceType;
pub use shared::PlatformMetadata;
pub use unauthenticated::get_unauthenticated_client;
