use comm_lib::{
  blob::{
    client::BlobServiceClient,
    types::http::{RemoveHoldersRequest, RemoveHoldersResponse},
  },
  database::batch_operations::ExponentialBackoffConfig,
  tools::base64_to_base64url,
};
use tracing::{debug, warn};

#[tracing::instrument(skip_all)]
pub async fn remove_holders_for_devices(
  blob_client: &BlobServiceClient,
  device_ids: &[String],
) -> Result<(), crate::error::Error> {
  if device_ids.is_empty() {
    debug!("No holders to remove.");
    return Ok(());
  }

  debug!(
    "Attempting to remove holders for {} devices.",
    device_ids.len()
  );

  let retry_config = ExponentialBackoffConfig::default();
  let mut retry_counter = retry_config.new_counter();

  // holders are prefixed with deviceID in base64url format
  // to escape forbidden characters
  let holder_prefixes: Vec<String> = device_ids
    .iter()
    .map(|device_id| base64_to_base64url(device_id))
    .collect();

  let mut request = RemoveHoldersRequest::ByIndexedTags {
    tags: holder_prefixes,
  };
  loop {
    request = match blob_client.remove_multiple_holders(request.clone()).await {
      Ok(response) if response.failed_requests.is_empty() => break,
      Ok(RemoveHoldersResponse { failed_requests }) => {
        warn!(
          "Remaining {} holders not removed. Retrying...",
          failed_requests.len()
        );
        RemoveHoldersRequest::from(failed_requests)
      }
      Err(err) => {
        warn!(?err, "Removing holders failed due to error. Retrying...");
        request
      }
    };
    retry_counter.sleep_and_retry().await?;
  }
  debug!("Removed all holders");
  Ok(())
}
