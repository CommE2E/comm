use web_push::{
  ContentEncoding, HyperWebPushClient, SubscriptionInfo, VapidSignatureBuilder,
  WebPushMessageBuilder,
};
use web_push::{PartialVapidSignatureBuilder, WebPushClient as _};

use crate::notifs::web_push::config::WebPushConfig;

pub mod config;
mod error;

#[derive(Clone)]
pub struct WebPushClient {
  _config: WebPushConfig,
  inner_client: HyperWebPushClient,
  signature_builder: PartialVapidSignatureBuilder,
}

impl WebPushClient {
  pub fn new(config: &WebPushConfig) -> Result<Self, error::Error> {
    let inner_client = HyperWebPushClient::new();
    let signature_builder = VapidSignatureBuilder::from_base64_no_sub(
      &config.private_key,
      web_push::URL_SAFE_NO_PAD,
    )?;
    Ok(WebPushClient {
      _config: config.clone(),
      inner_client,
      signature_builder,
    })
  }
}
