use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::identity::olm_account_infos::get_random_otk;
use commtest::service_addr;
use grpc_clients::identity::{
  get_auth_client, protos::authenticated::UploadOneTimeKeysRequest,
};

#[tokio::test]
async fn upload_one_time_keys() {
  let device_info = register_user_device(None, None).await;

  let mut identity_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    device_info.user_id,
    device_info.device_id,
    device_info.access_token,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let upload_request = UploadOneTimeKeysRequest {
    content_one_time_prekeys: vec![get_random_otk(), get_random_otk()],
    notif_one_time_prekeys: vec![get_random_otk(), get_random_otk()],
  };

  identity_client
    .upload_one_time_keys(upload_request)
    .await
    .unwrap();
}
