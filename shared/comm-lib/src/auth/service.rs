use aws_sdk_secretsmanager::Client as SecretsManagerClient;
use chrono::{DateTime, Duration, Utc};
use grpc_clients::identity::unauthenticated::client as identity_client;

use super::{
  is_csat_verification_disabled, AuthorizationCredential, ServicesAuthToken,
  UserIdentity,
};

const SECRET_NAME: &str = "servicesToken";
/// duration for which we consider previous token valid
/// after rotation
const ROTATION_PROTECTION_PERIOD: i64 = 3; // seconds

// AWS managed version tags for secrets
const AWSCURRENT: &str = "AWSCURRENT";
const AWSPREVIOUS: &str = "AWSPREVIOUS";

// Identity service gRPC clients require a code version and device type.
// We can supply some placeholder values for services for the time being, since
// this metadata is only relevant for devices.
const PLACEHOLDER_CODE_VERSION: u64 = 0;
const DEVICE_TYPE: &str = "service";

#[derive(
  Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum AuthServiceError {
  SecretManagerError(aws_sdk_secretsmanager::Error),
  GrpcError(grpc_clients::error::Error),
  Unexpected,
}

type AuthServiceResult<T> = Result<T, AuthServiceError>;

/// This service is responsible for handling request authentication.
/// For HTTP services, it should be added as app data to the server:
/// ```ignore
/// let auth_service = AuthService::new(&aws_config, &config.identity_endpoint);
/// let auth_middleware = get_comm_authentication_middleware();
/// App::new()
///   .app_data(auth_service.clone())
///   .wrap(auth_middleware)
///   // ...
/// ```
#[derive(Clone)]
pub struct AuthService {
  secrets_manager: SecretsManagerClient,
  identity_service_url: String,
}

impl AuthService {
  pub fn new(
    aws_cfg: &aws_config::SdkConfig,
    identity_service_url: impl Into<String>,
  ) -> Self {
    let secrets_client = SecretsManagerClient::new(aws_cfg);
    AuthService {
      secrets_manager: secrets_client,
      identity_service_url: identity_service_url.into(),
    }
  }

  /// Obtains a service-to-service token which can be used to authenticate
  /// when calling other services endpoints. It should be only used when
  /// no [`UserIdentity`] is provided from client
  pub async fn get_services_token(
    &self,
  ) -> AuthServiceResult<ServicesAuthToken> {
    get_services_token_version(&self.secrets_manager, AWSCURRENT)
      .await
      .map_err(AuthServiceError::from)
  }

  /// Verifies the provided [`AuthorizationCredential`]. Returns `true` if
  /// authentication was successful or CSAT verification is disabled.
  pub async fn verify_auth_credential(
    &self,
    credential: &AuthorizationCredential,
  ) -> AuthServiceResult<bool> {
    if is_csat_verification_disabled() {
      return Ok(true);
    }
    match credential {
      AuthorizationCredential::UserToken(user) => {
        let UserIdentity {
          user_id,
          device_id,
          access_token,
        } = user;
        identity_client::verify_user_access_token(
          &self.identity_service_url,
          user_id,
          device_id,
          access_token,
          PLACEHOLDER_CODE_VERSION,
          DEVICE_TYPE.to_string(),
        )
        .await
        .map_err(AuthServiceError::from)
      }
      AuthorizationCredential::ServicesToken(token) => {
        verify_services_token(&self.secrets_manager, token)
          .await
          .map_err(AuthServiceError::from)
      }
    }
  }
}

async fn get_services_token_version(
  client: &SecretsManagerClient,
  version: impl Into<String>,
) -> Result<ServicesAuthToken, aws_sdk_secretsmanager::Error> {
  let result = client
    .get_secret_value()
    .secret_id(SECRET_NAME)
    .version_stage(version)
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
    .and_then(DateTime::from_timestamp_millis)
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
