use crate::constants::PUSH_SERVICE_REQUEST_TIMEOUT;
use serde::{Deserialize, Serialize};
use web_push::{
  ContentEncoding, HyperWebPushClient, SubscriptionInfo, VapidSignatureBuilder,
  WebPushMessageBuilder,
};
use web_push::{PartialVapidSignatureBuilder, WebPushClient as _};

use crate::notifs::web_push::config::WebPushConfig;

pub mod config;
pub mod error;

#[derive(Serialize, Deserialize)]
pub struct WebPushNotif {
  /// Device token for web is a JSON-encoded [`SubscriptionInfo`].
  pub device_token: String,
  pub payload: String,
}

#[derive(Clone)]
pub struct WebPushClient {
  _config: WebPushConfig,
  inner_client: HyperWebPushClient,
  signature_builder: PartialVapidSignatureBuilder,
}

impl WebPushClient {
  pub fn new(config: &WebPushConfig) -> Result<Self, error::Error> {
    let inner_client = HyperWebPushClient::new();
    let signature_builder =
      VapidSignatureBuilder::from_base64_no_sub(&config.private_key)?;
    Ok(WebPushClient {
      _config: config.clone(),
      inner_client,
      signature_builder,
    })
  }

  pub async fn send(&self, notif: WebPushNotif) -> Result<(), error::Error> {
    let subscription =
      serde_json::from_str::<SubscriptionInfo>(&notif.device_token)?;

    let vapid_signature = self
      .signature_builder
      .clone()
      .add_sub_info(&subscription)
      .build()?;

    let mut builder = WebPushMessageBuilder::new(&subscription);
    builder.set_payload(ContentEncoding::Aes128Gcm, notif.payload.as_bytes());
    builder.set_vapid_signature(vapid_signature);

    let message = builder.build()?;
    let response_future = self.inner_client.send(message);

    tokio::time::timeout(PUSH_SERVICE_REQUEST_TIMEOUT, response_future)
      .await
      .map_err(|_err| {
        error::Error::WebPush(web_push::WebPushError::Unspecified)
      })??;

    Ok(())
  }
}
