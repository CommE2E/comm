use crate::tools::Error;
use crate::tunnelbroker::tunnelbroker_utils::{
  proto::SessionSignatureRequest, TunnelbrokerServiceClient,
};
use openssl::hash::MessageDigest;
use openssl::pkey::PKey;
use openssl::sign::Signer;
use tonic::Request;

pub async fn get_string_to_sign(
  client: &mut TunnelbrokerServiceClient<tonic::transport::Channel>,
  device_id: &str,
) -> Result<String, Error> {
  let response = client
    .session_signature(Request::new(SessionSignatureRequest {
      device_id: String::from(device_id),
    }))
    .await?;
  Ok(response.into_inner().to_sign)
}

pub fn sign_string_with_private_key(
  keypair: &PKey<openssl::pkey::Private>,
  string_to_be_signed: &str,
) -> anyhow::Result<String> {
  let mut signer = Signer::new(MessageDigest::sha256(), &keypair)?;
  signer.update(string_to_be_signed.as_bytes())?;
  let signature = signer.sign_to_vec()?;
  Ok(base64::encode(signature))
}
