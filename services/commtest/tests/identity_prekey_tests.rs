use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::identity::olm_account::{AccountType, MockOlmAccount};
use commtest::service_addr;
use grpc_clients::identity::PlatformMetadata;
use grpc_clients::identity::{
  get_auth_client, protos::authenticated::RefreshUserPrekeysRequest,
};

#[tokio::test]
async fn set_prekey() {
  let olm_account = MockOlmAccount::new();
  let device_keys = olm_account.public_keys();
  let device_info = register_user_device(Some(&device_keys), None).await;

  let mut client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    device_info.user_id,
    device_info.device_id,
    device_info.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let new_content_prekey = olm_account.generate_prekey(AccountType::Content);
  let new_notif_prekey = olm_account.generate_prekey(AccountType::Notif);

  let upload_request = RefreshUserPrekeysRequest {
    new_content_prekey: Some(new_content_prekey),
    new_notif_prekey: Some(new_notif_prekey),
  };

  // This send will fail if prekeys weren't successfully updated
  println!(
    "Error: {:?}",
    client.refresh_user_prekeys(upload_request).await
  );
}
