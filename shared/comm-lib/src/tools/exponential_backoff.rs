use rand::Rng;
use std::time::Duration;

#[derive(Debug, derive_more::Display, derive_more::Error)]
#[display(fmt = "[Exponential backoff] Maximum retries exceeded")]
pub struct MaxRetriesExceededError;

/// Exponential backoff configuration for batch write operation
#[derive(derive_more::Constructor, Debug)]
pub struct ExponentialBackoffConfig {
  /// Maximum retry attempts before the function fails.
  /// Set this to 0 to disable exponential backoff.
  /// Defaults to **8**.
  pub max_attempts: u32,
  /// Base wait duration before retry. Defaults to **25ms**.
  /// It is doubled with each attempt: 25ms, 50, 100, 200...
  pub base_duration: Duration,
  /// Jitter factor for retry delay. Factor 0.5 for 100ms delay
  /// means that wait time will be between 50ms and 150ms.
  /// The value must be in range 0.0 - 1.0. It will be clamped
  /// if out of these bounds. Defaults to **0.3**
  pub jitter_factor: f32,
  /// Retry on [`ProvisionedThroughputExceededException`].
  /// Defaults to **true**.
  ///
  /// [`ProvisionedThroughputExceededException`]: aws_sdk_dynamodb::Error::ProvisionedThroughputExceededException
  #[cfg(feature = "aws")]
  pub retry_on_provisioned_capacity_exceeded: bool,
}

impl Default for ExponentialBackoffConfig {
  fn default() -> Self {
    ExponentialBackoffConfig {
      max_attempts: 8,
      base_duration: Duration::from_millis(25),
      jitter_factor: 0.3,
      #[cfg(feature = "aws")]
      retry_on_provisioned_capacity_exceeded: true,
    }
  }
}

impl ExponentialBackoffConfig {
  pub fn new_counter(&self) -> ExponentialBackoffHelper {
    ExponentialBackoffHelper::new(self)
  }
  fn backoff_enabled(&self) -> bool {
    self.max_attempts > 0
  }

  #[cfg(feature = "aws")]
  pub(crate) fn should_retry_on_capacity_exceeded(&self) -> bool {
    self.backoff_enabled() && self.retry_on_provisioned_capacity_exceeded
  }
}

/// Utility for managing retries with exponential backoff
pub struct ExponentialBackoffHelper<'cfg> {
  config: &'cfg ExponentialBackoffConfig,
  attempt: u32,
}

impl<'cfg> ExponentialBackoffHelper<'cfg> {
  fn new(config: &'cfg ExponentialBackoffConfig) -> Self {
    ExponentialBackoffHelper { config, attempt: 0 }
  }

  /// reset counter after successfull operation
  pub fn reset(&mut self) {
    self.attempt = 0;
  }

  /// Returns 1 before the first retry, then 2,3,... after subsequent retries
  pub fn attempt(&self) -> u32 {
    self.attempt + 1
  }

  /// increase counter and sleep in case of failure
  pub async fn sleep_and_retry(
    &mut self,
  ) -> Result<(), MaxRetriesExceededError> {
    let jitter_factor = 1f32.min(0f32.max(self.config.jitter_factor));
    let random_multiplier =
      1.0 + rand::thread_rng().gen_range(-jitter_factor..=jitter_factor);
    let backoff_multiplier = 2u32.pow(self.attempt);
    let base_duration = self.config.base_duration * backoff_multiplier;
    let sleep_duration = base_duration.mul_f32(random_multiplier);

    self.attempt += 1;
    if self.attempt > self.config.max_attempts {
      tracing::warn!("Retry limit exceeded!");
      return Err(MaxRetriesExceededError);
    }
    tracing::debug!(
      attempt = self.attempt,
      "Batch failed. Sleeping for {}ms before retrying...",
      sleep_duration.as_millis()
    );
    tokio::time::sleep(sleep_duration).await;
    Ok(())
  }
}
