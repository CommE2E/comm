pub mod authenticated;
pub mod shared;

pub mod protos {
  pub mod unauth {
    tonic::include_proto!("identity.unauth");
  }
  pub mod auth {
    tonic::include_proto!("identity.auth");
  }
}
