use a2::{
  Client, Endpoint, NotificationBuilder, NotificationOptions,
  PlainNotificationBuilder, Response,
};
use std::fs::File;

#[allow(non_snake_case)]
pub async fn sendByA2Client(
  certificatePath: &str,
  certificatePassword: &str,
  deviceToken: &str,
  message: &str,
  sandbox: bool,
) -> Response {
  let mut certificate = File::open(certificatePath).unwrap();
  // Which service to call: test or production
  let endpoint = if sandbox {
    Endpoint::Sandbox
  } else {
    Endpoint::Production
  };
  let client =
    Client::certificate(&mut certificate, certificatePassword, endpoint)
      .unwrap();
  let options = NotificationOptions {
    ..Default::default()
  };
  let builder = PlainNotificationBuilder::new(message);
  let payload = builder.build(deviceToken, options);
  client.send(payload).await.unwrap()
}
