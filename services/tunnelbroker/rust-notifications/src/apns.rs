use a2::{
  Client, Endpoint, NotificationBuilder, NotificationOptions,
  PlainNotificationBuilder,
};
use anyhow::Result;
use std::fs::File;

pub async fn send_by_a2_client(
  certificate_path: &str,
  certificate_password: &str,
  device_token: &str,
  message: &str,
  sandbox: bool,
) -> Result<u16> {
  let mut certificate = File::open(certificate_path)?;
  let endpoint = if sandbox {
    Endpoint::Sandbox
  } else {
    Endpoint::Production
  };
  let client =
    Client::certificate(&mut certificate, certificate_password, endpoint)?;
  let options = NotificationOptions {
    ..Default::default()
  };
  let builder = PlainNotificationBuilder::new(message);
  let payload = builder.build(device_token, options);
  let response = client.send(payload).await?;
  Ok(response.code)
}
