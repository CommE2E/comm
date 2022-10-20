use crate::ffi::fcm_status;
use anyhow::{bail, ensure, Result};
use fcm::{
  response::ErrorReason::{InvalidRegistration, NotRegistered},
  Client, MessageBuilder, NotificationBuilder,
};

pub async fn send_by_fcm_client(
  fcm_api_key: &str,
  device_registration_id: &str,
  message_title: &str,
  message_body: &str,
) -> Result<fcm_status> {
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
      ensure!(results.len() > 0, "FCM client returned zero size results");
      if let Some(result_error) = results[0].error {
        match result_error {
          // We are returning `Ok` with the error types here to distinguish the exact
          // error type in a C++ side
          InvalidRegistration => return Ok(fcm_status::InvalidRegistration),
          NotRegistered => return Ok(fcm_status::NotRegistered),
          _ => bail!(
            "Notification was not accepted by FCM, reason: {:?}",
            result_error,
          ),
        }
      }
    }
    None => bail!("FCM client has no results set"),
  }
  Ok(fcm_status::Ok)
}
