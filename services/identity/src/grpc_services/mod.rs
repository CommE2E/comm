pub mod authenticated;
pub mod shared;

pub mod protos {
  pub mod unauth {
    tonic::include_proto!("identity.client");
  }
  pub mod auth {
    tonic::include_proto!("identity.authenticated");
  }

  // This must be named client, because generated code from the authenticated
  // protobuf file references message structs from the client protobuf file
  // with the client:: namespace
  pub use self::unauth as client;
}
