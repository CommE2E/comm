use comm_lib::{
  blob::{client::BlobServiceClient, types::http::RemoveHoldersRequest},
  database::batch_operations::ExponentialBackoffConfig,
};
use tracing::debug;

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

  let holder_prefixes = Vec::from(device_ids);
  let mut pending_request = Some(RemoveHoldersRequest::from(holder_prefixes));
  loop {
    let Some(request) = pending_request.take() else {
      break;
    };

    let remaining = blob_client
      .remove_multiple_holders(request)
      .await?
      .failed_requests;

    if remaining.is_empty() {
      break;
    }

    debug!("Remaining {} holders not removed.", remaining.len());
    pending_request = Some(remaining.into());
    retry_counter.sleep_and_retry().await?;
  }
  debug!("Removed all holders");
  Ok(())
}
