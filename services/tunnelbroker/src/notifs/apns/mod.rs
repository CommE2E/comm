use crate::notifs::apns::token::APNsToken;

pub mod config;
mod error;
pub mod token;

#[derive(Clone)]
pub struct APNsClient {
  http2_client: reqwest::Client,
  token: APNsToken,
  is_prod: bool,
}
