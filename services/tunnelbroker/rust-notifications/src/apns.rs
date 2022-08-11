use a2::{
  Client, Endpoint, NotificationBuilder, NotificationOptions,
  PlainNotificationBuilder, Response,
};
use std::fs::File;

#[allow(non_snake_case)]
pub async fn sendByA2Client(
  certificatePath: &String,
  certificatePassword: &String,
  deviceToken: &String,
  message: &String,
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
    Client::certificate(&mut certificate, &certificatePassword, endpoint)
      .unwrap();
  let options = NotificationOptions {
    ..Default::default()
  };
  let mut builder = PlainNotificationBuilder::new(message.as_ref());
  builder.set_sound("default");
  builder.set_badge(1u32);
  let payload = builder.build(deviceToken.as_ref(), options);
  client.send(payload).await.unwrap()
}
