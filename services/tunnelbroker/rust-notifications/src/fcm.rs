use anyhow::{anyhow, Result};
use fcm::{Client, MessageBuilder, NotificationBuilder};

pub async fn send_by_fcm_client(
  fcm_api_key: &str,
  device_registration_id: &str,
  message_title: &str,
  message_body: &str,
) -> Result<()> {
  let client = Client::new();
  let mut notification_builder = NotificationBuilder::new();
  notification_builder.title(message_title);
  notification_builder.body(message_body);

  let notification = notification_builder.finalize();
  let mut message_builder =
    MessageBuilder::new(fcm_api_key, device_registration_id);
  message_builder.notification(notification);
  let result = client.send(message_builder.finalize()).await?;
  match result.results {
    Some(results) => {
      if results.len() == 0 {
        return Err(anyhow!("Client returned zero size results"));
      }
      for result in results {
        match result.error {
          Some(error) => return Err(anyhow!("Result error: {:?}", error)),
          None => (),
        }
      }
    }
    None => return Err(anyhow!("Client has no results set")),
  }
  Ok(())
}
