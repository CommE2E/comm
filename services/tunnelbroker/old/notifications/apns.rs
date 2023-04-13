use super::CONFIG;
use a2::{
  Client, Endpoint, Error,
  ErrorReason::{BadDeviceToken, Unregistered},
  NotificationBuilder, NotificationOptions, PlainNotificationBuilder,
};
use std::fs::File;

pub enum ApnsError {
  BadDeviceToken,
  Unregistered,
  CommonError(anyhow::Error),
}

pub async fn send_by_a2_client(
  device_token: &str,
  message: &str,
) -> Result<(), ApnsError> {
  let mut certificate = File::open(&CONFIG.apns_certificate_path)
    .expect("Error opening apns certificate file");
  let endpoint = if CONFIG.is_sandbox {
    Endpoint::Sandbox
  } else {
    Endpoint::Production
  };
  let client = Client::certificate(
    &mut certificate,
    &CONFIG.apns_certificate_password,
    endpoint,
  )
  .expect("Error creating client on apns certificate");
  let options = NotificationOptions {
    apns_topic: Some(&CONFIG.apns_topic),
    ..Default::default()
  };
  let builder = PlainNotificationBuilder::new(message);
  let mut payload = builder.build(device_token, options);
  payload.aps.content_available = Some(1);
  match client.send(payload).await {
    Ok(_) => Ok(()),
    Err(Error::ResponseError(response)) => {
      if let Some(error_body) = response.error {
        match error_body.reason {
          BadDeviceToken => Err(ApnsError::BadDeviceToken),
          Unregistered => Err(ApnsError::Unregistered),
          _ => Err(ApnsError::CommonError(anyhow::Error::msg(format!(
            "Notification was not accepted by APNs, reason: {:?}",
            error_body.reason
          )))),
        }
      } else {
        Err(ApnsError::CommonError(anyhow::Error::msg(format!(
          "Unhandled response error from APNs, response: {:?}",
          response
        ))))
      }
    }
    Err(error) => Err(ApnsError::CommonError(anyhow::Error::new(error))),
  }
}
