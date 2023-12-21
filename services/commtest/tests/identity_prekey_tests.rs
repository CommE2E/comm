use commtest::identity::device::{
  create_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::service_addr;
use grpc_clients::identity::{
  get_auth_client,
  protos::{authenticated::RefreshUserPrekeysRequest, client::Prekey},
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
