use commtest::identity::device::{
  create_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::service_addr;
use grpc_clients::identity::{
  get_auth_client,
  protos::{authenticated::RefreshUserPreKeysRequest, client::PreKey},
};

#[tokio::test]
async fn set_prekey() {
  let device_info = create_device(None).await;

  let mut client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    device_info.user_id,
    device_info.device_id,
    device_info.access_token,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let upload_request = RefreshUserPreKeysRequest {
    new_content_pre_keys: Some(PreKey {
      pre_key: "content_prekey".to_string(),
      pre_key_signature: "content_prekey_signature".to_string(),
    }),
    new_notif_pre_keys: Some(PreKey {
      pre_key: "content_prekey".to_string(),
      pre_key_signature: "content_prekey_signature".to_string(),
    }),
  };

  // This send will fail if the one-time keys weren't successfully added
  println!(
    "Error: {:?}",
    client.refresh_user_pre_keys(upload_request).await
  );
}
