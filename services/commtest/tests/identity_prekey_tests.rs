use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::service_addr;
use grpc_clients::identity::PlatformMetadata;
use grpc_clients::identity::{
  get_auth_client,
  protos::{authenticated::RefreshUserPrekeysRequest, unauth::Prekey},
};

#[tokio::test]
async fn set_prekey() {
  let device_info = register_user_device(None, None).await;

  let mut client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    device_info.user_id,
    device_info.device_id,
    device_info.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let upload_request = RefreshUserPrekeysRequest {
    new_content_prekeys: Some(Prekey {
      prekey: "content_prekey".to_string(),
      prekey_signature: "content_prekey_signature".to_string(),
    }),
    new_notif_prekeys: Some(Prekey {
      prekey: "content_prekey".to_string(),
      prekey_signature: "content_prekey_signature".to_string(),
    }),
  };

  // This send will fail if the one-time keys weren't successfully added
  println!(
    "Error: {:?}",
    client.refresh_user_prekeys(upload_request).await
  );
}
