mod proto {
  tonic::include_proto!("blob");
}
use proto::blob_service_client::BlobServiceClient;
pub use proto::put_request::Data as PutRequestData;
pub use proto::{PutRequest, PutResponse};

mod downloader;
mod uploader;
pub use downloader::*;
pub use uploader::*;

pub type BlobClient = BlobServiceClient<tonic::transport::Channel>;

/// Creates a new Blob service client instance. It does not attempt to connect
/// to the service until first use.
pub fn init_blob_client() -> BlobClient {
  let service_url = &crate::CONFIG.blob_service_url;
  let channel =
    tonic::transport::Channel::from_static(service_url).connect_lazy();
  BlobServiceClient::new(channel)
}
