mod proto {
  tonic::include_proto!("blob");
}
pub use proto::put_request::Data as PutRequestData;
pub use proto::{PutRequest, PutResponse};

mod get_client;
mod put_client;
pub use get_client::*;
pub use put_client::*;
