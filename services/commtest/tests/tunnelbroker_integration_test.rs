use commtest::tunnelbroker::{
  new_session::create_new_session,
  new_session::get_string_to_sign,
  new_session::sign_string_with_private_key,
  tunnelbroker_utils::{
    proto::new_session_request::DeviceTypes,
    session_signature_device_id_format_validation, tonic_client_builder,
  },
};
use openssl::pkey::PKey;
use openssl::rsa::Rsa;

#[tokio::test]
async fn tunnelbroker_integration_test() -> Result<(), anyhow::Error> {
  const DEVICE_ID: &str =
    "mobile:OOOTESTb2ueEmQ4QsevRWlXxFCNt055y20T1PHdoYAQRt0S6TLzZWNM6XSvdW000";

  // Should fail on the wrong device ID format provided
  let mut client = tonic_client_builder().await?;
  assert!(
    session_signature_device_id_format_validation(&mut client)
      .await
      .is_ok(),
    "DeviceID format validation failed on getting session signature request"
  );

  // Generate a keypair
  let keypair = Rsa::generate(1024)?;
  let keypair = PKey::from_rsa(keypair)?;
  let public_key_pem = String::from_utf8(keypair.public_key_to_pem()?)?;

  // Get and sign the string to be signed
  let string_to_be_signed = get_string_to_sign(&mut client, DEVICE_ID).await?;
  let signature_base64 =
    sign_string_with_private_key(&keypair, &string_to_be_signed)?;

  // Should fail on the wrong signature provided
  assert!(
    create_new_session(
      &mut client,
      DEVICE_ID,
      &public_key_pem,
      "wrong_signature",
      "fake_notify_token",
      DeviceTypes::Mobile,
      "v.x.x.x",
      "iOS x.x.x",
    )
    .await
    .is_err(),
    "New session returns success when using wrong signature"
  );

  // Create a new session with the correct signature
  let _session_id = create_new_session(
    &mut client,
    DEVICE_ID,
    &public_key_pem,
    &signature_base64,
    "fake_notify_token",
    DeviceTypes::Mobile,
    "v.x.x.x",
    "iOS x.x.x",
  )
  .await?;

  Ok(())
}
