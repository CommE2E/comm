use crate::{
  farcaster::farcaster_id_string_to_option, handle_string_result_as_callback,
  Error, UserIDAndDeviceAccessToken, WalletUserInfo, CODE_VERSION, DEVICE_TYPE,
  IDENTITY_SOCKET_ADDR, RUNTIME,
};
use grpc_clients::identity::{
  get_unauthenticated_client,
  protos::unauth::{
    DeviceKeyUpload, IdentityKeyInfo, Prekey, WalletAuthRequest,
  },
};
use tracing::instrument;

#[instrument]
pub fn register_wallet_user(
  siwe_message: String,
  siwe_signature: String,
  key_payload: String,
  key_payload_signature: String,
  content_prekey: String,
  content_prekey_signature: String,
  notif_prekey: String,
  notif_prekey_signature: String,
  content_one_time_keys: Vec<String>,
  notif_one_time_keys: Vec<String>,
  farcaster_id: String,
  promise_id: u32,
) {
  RUNTIME.spawn(async move {
    let wallet_user_info = WalletUserInfo {
      siwe_message,
      siwe_signature,
      key_payload,
      key_payload_signature,
      content_prekey,
      content_prekey_signature,
      notif_prekey,
      notif_prekey_signature,
      content_one_time_keys,
      notif_one_time_keys,
      farcaster_id: farcaster_id_string_to_option(&farcaster_id),
    };
    let result = register_wallet_user_helper(wallet_user_info).await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn register_wallet_user_helper(
  wallet_user_info: WalletUserInfo,
) -> Result<String, Error> {
  let registration_request = WalletAuthRequest {
    siwe_message: wallet_user_info.siwe_message,
    siwe_signature: wallet_user_info.siwe_signature,
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: wallet_user_info.key_payload,
        payload_signature: wallet_user_info.key_payload_signature,
        social_proof: None, // The SIWE message and signature are the social proof
      }),
      content_upload: Some(Prekey {
        prekey: wallet_user_info.content_prekey,
        prekey_signature: wallet_user_info.content_prekey_signature,
      }),
      notif_upload: Some(Prekey {
        prekey: wallet_user_info.notif_prekey,
        prekey_signature: wallet_user_info.notif_prekey_signature,
      }),
      one_time_content_prekeys: wallet_user_info.content_one_time_keys,
      one_time_notif_prekeys: wallet_user_info.notif_one_time_keys,
      device_type: DEVICE_TYPE.into(),
    }),
    farcaster_id: wallet_user_info.farcaster_id,
  };

  let mut identity_client = get_unauthenticated_client(
    IDENTITY_SOCKET_ADDR,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let registration_response = identity_client
    .register_wallet_user(registration_request)
    .await?
    .into_inner();

  let user_id_and_access_token = UserIDAndDeviceAccessToken {
    user_id: registration_response.user_id,
    access_token: registration_response.access_token,
  };
  Ok(serde_json::to_string(&user_id_and_access_token)?)
}
