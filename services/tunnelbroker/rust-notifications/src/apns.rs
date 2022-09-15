use crate::ffi::apns_status;
use a2::{
  Client, Endpoint, Error,
  ErrorReason::{BadDeviceToken, Unregistered},
  NotificationBuilder, NotificationOptions, PlainNotificationBuilder,
};
use anyhow::{anyhow, Result};
use std::fs::File;

pub async fn send_by_a2_client(
  certificate_path: &str,
  certificate_password: &str,
  device_token: &str,
  topic: &str,
  message: &str,
  sandbox: bool,
) -> Result<apns_status> {
  let mut certificate = File::open(certificate_path)?;
  let endpoint = if sandbox {
    Endpoint::Sandbox
  } else {
    Endpoint::Production
  };
  let client =
    Client::certificate(&mut certificate, certificate_password, endpoint)?;
  let options = NotificationOptions {
    apns_topic: Some(topic),
    ..Default::default()
  };
  let builder = PlainNotificationBuilder::new(message);
  let mut payload = builder.build(device_token, options);
  payload.aps.content_available = Some(1);
  match client.send(payload).await {
    Ok(_) => Ok(apns_status::Ok),
    Err(Error::ResponseError(response)) => {
      if let Some(error_body) = response.error {
        match error_body.reason {
          // We are returning `Ok` with the error types here to distinguish the exact 
          // error type in a C++ side
          BadDeviceToken => Ok(apns_status::BadDeviceToken),
          Unregistered => Ok(apns_status::Unregistered),
          _ => Err(anyhow!(
            "Notification was not accepted by APNs, reason: {:?}",
            error_body.reason
          )),
        }
      } else {
        Err(anyhow!(
          "Unhandled response error from APNs, response: {:?}",
          response
        ))
      }
    }
    Err(error) => Err(anyhow::Error::new(error)),
  }
}
