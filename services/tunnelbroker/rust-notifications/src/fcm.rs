use anyhow::{anyhow, Result};
use fcm::{Client, MessageBuilder, NotificationBuilder};

pub async fn send_by_fcm_client(
  fcm_api_key: &str,
  device_registration_id: &str,
  message_title: &str,
  message_body: &str,
) -> Result<u64> {
  let client = Client::new();
  let mut notification_builder = NotificationBuilder::new();
  notification_builder.title(message_title);
  notification_builder.body(message_body);

  let notification = notification_builder.finalize();
  let mut message_builder =
    MessageBuilder::new(fcm_api_key, device_registration_id);
  message_builder.notification(notification);
  let result = client.send(message_builder.finalize()).await?;
  match result.message_id {
    Some(message_id) => Ok(message_id),
    None => Err(anyhow!("FCM client returned an empty message id")),
  }
}
