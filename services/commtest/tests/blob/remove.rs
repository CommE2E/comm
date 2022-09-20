use crate::blob::blob_utils::{
  proto::RemoveRequest, BlobData, BlobServiceClient,
};
use crate::tools::Error;
use tonic::Request;

pub async fn run(
  client: &mut BlobServiceClient<tonic::transport::Channel>,
  blob_data: &BlobData,
) -> Result<(), Error> {
  let cloned_holder = blob_data.holder.clone();
  println!("[{}] remove", cloned_holder);

  client
    .remove(Request::new(RemoveRequest {
      holder: cloned_holder,
    }))
    .await?;
  Ok(())
}
