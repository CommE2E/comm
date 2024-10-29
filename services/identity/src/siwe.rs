use std::collections::HashMap;

use comm_lib::{
  aws::ddb::types::AttributeValue,
  database::{AttributeExtractor, AttributeMap, TryFromAttribute},
};
use siwe::{Message, VerificationOpts};
use time::OffsetDateTime;
use tonic::Status;
use tracing::error;

use crate::constants::{
  error_types, tonic_status_messages, SOCIAL_PROOF_MESSAGE_ATTRIBUTE,
  SOCIAL_PROOF_SIGNATURE_ATTRIBUTE,
};

pub async fn parse_and_verify_siwe_message(
  siwe_message: &str,
  siwe_signature: &str,
) -> Result<Message, Status> {
  let siwe_message: Message = siwe_message.parse().map_err(|e| {
    error!(
      errorType = error_types::SIWE_LOG,
      "Failed to parse SIWE message: {}", e
    );
    Status::invalid_argument(tonic_status_messages::INVALID_MESSAGE)
  })?;

  let decoded_signature = hex::decode(siwe_signature.trim_start_matches("0x"))
    .map_err(|e| {
      error!(
        errorType = error_types::SIWE_LOG,
        "Failed to decode SIWE signature: {}", e
      );
      Status::invalid_argument(tonic_status_messages::SIGNATURE_INVALID)
    })?;

  let options = VerificationOpts {
    domain: None,
    nonce: None,
    timestamp: Some(OffsetDateTime::now_utc()),
  };
  siwe_message
    .verify(&decoded_signature, &options)
    .await
    .map_err(|e| {
      error!(
        errorType = error_types::SIWE_LOG,
        "Signature verification failed: {}", e
      );
      Status::unauthenticated(tonic_status_messages::MESSAGE_NOT_AUTHENTICATED)
    })?;

  Ok(siwe_message)
}

#[derive(derive_more::Constructor, Clone)]
pub struct SocialProof {
  pub message: String,
  pub signature: String,
}

impl From<SocialProof> for AttributeValue {
  fn from(value: SocialProof) -> Self {
    AttributeValue::M(HashMap::from([
      (
        SOCIAL_PROOF_MESSAGE_ATTRIBUTE.to_string(),
        AttributeValue::S(value.message),
      ),
      (
        SOCIAL_PROOF_SIGNATURE_ATTRIBUTE.to_string(),
        AttributeValue::S(value.signature),
      ),
    ]))
  }
}

impl TryFrom<AttributeMap> for SocialProof {
  type Error = comm_lib::database::DBItemError;

  fn try_from(mut attrs: AttributeMap) -> Result<Self, Self::Error> {
    let message = attrs.take_attr(SOCIAL_PROOF_MESSAGE_ATTRIBUTE)?;
    let signature = attrs.take_attr(SOCIAL_PROOF_SIGNATURE_ATTRIBUTE)?;
    Ok(Self { message, signature })
  }
}

impl TryFromAttribute for SocialProof {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, comm_lib::database::DBItemError> {
    AttributeMap::try_from_attr(attribute_name, attribute)
      .and_then(SocialProof::try_from)
  }
}

#[cfg(test)]
mod tests {
  use crate::constants::USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME;

  use super::*;

  #[test]
  fn test_social_proof_ddb_format() {
    let message = "foo";
    let signature = "bar";
    let social_proof =
      SocialProof::new(message.to_string(), signature.to_string());

    let mut user_item = AttributeMap::from([(
      USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME.to_string(),
      social_proof.into(),
    )]);

    let social_proof_from_attr: SocialProof = user_item
      .take_attr(USERS_TABLE_SOCIAL_PROOF_ATTRIBUTE_NAME)
      .expect("social proof fetch failed");

    assert_eq!(social_proof_from_attr.message, message);
    assert_eq!(social_proof_from_attr.signature, signature);
  }
}
