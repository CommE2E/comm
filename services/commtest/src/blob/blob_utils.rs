pub mod proto {
  tonic::include_proto!("blob");
}

pub use proto::blob_service_client::BlobServiceClient;

#[derive(Clone)]
pub struct BlobData {
  pub holder: String,
  pub hash: String,
  pub chunks_sizes: Vec<usize>,
}
