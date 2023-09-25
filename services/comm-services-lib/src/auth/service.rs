use aws_sdk_secretsmanager::Client as SecretsManagerClient;
use chrono::{DateTime, Duration, NaiveDateTime, Utc};

use super::{AuthorizationCredential, ServicesAuthToken, UserIdentity};

const SECRET_NAME: &str = "servicesToken";
/// duration for which we consider previous token valid
/// after rotation
const ROTATION_PROTECTION_PERIOD: i64 = 3; // seconds

// AWS managed version tags for secrets
const AWSCURRENT: &str = "AWSCURRENT";
const AWSPREVIOUS: &str = "AWSPREVIOUS";

async fn get_services_token_version(
  client: &SecretsManagerClient,
  version: impl Into<String>,
) -> Result<ServicesAuthToken, aws_sdk_secretsmanager::Error> {
  let result = client
    .get_secret_value()
    .secret_id(SECRET_NAME)
    .version_id(version)
    .send()
    .await?;

  let token = result
    .secret_string()
    .expect("Services token secret is not a string. This should not happen");
  Ok(ServicesAuthToken::new(token.to_string()))
}

async fn time_since_rotation(
  client: &SecretsManagerClient,
) -> Result<Option<chrono::Duration>, aws_sdk_secretsmanager::Error> {
  let result = client
    .describe_secret()
    .secret_id(SECRET_NAME)
    .send()
    .await?;

  let duration = result
    .last_rotated_date()
    .and_then(|date| date.to_millis().ok())
    .and_then(NaiveDateTime::from_timestamp_millis)
    .map(|naive| DateTime::<Utc>::from_utc(naive, Utc))
    .map(|last_rotated| Utc::now().signed_duration_since(last_rotated));
  Ok(duration)
}

async fn verify_services_token(
  client: &SecretsManagerClient,
  token_to_verify: &ServicesAuthToken,
) -> Result<bool, aws_sdk_secretsmanager::Error> {
  let actual_token = get_services_token_version(client, AWSCURRENT).await?;

  // we need to always get it to achieve constant time eq
  let last_rotated = time_since_rotation(client).await?;
  let was_recently_rotated = last_rotated
    .filter(|rotation_time| {
      *rotation_time < Duration::seconds(ROTATION_PROTECTION_PERIOD)
    })
    .is_some();

  let is_valid = *token_to_verify == actual_token;
  // token might have just been rotated. In this case check the previous token
  // this case makes the function non-constant time, but it happens very rarely
  if !is_valid && was_recently_rotated {
    let previous_token =
      get_services_token_version(client, AWSPREVIOUS).await?;
    let previous_valid = *token_to_verify == previous_token;
    return Ok(previous_valid);
  }

  Ok(is_valid)
}
