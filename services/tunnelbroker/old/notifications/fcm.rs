use super::CONFIG;
use anyhow::Result;
use fcm::{
  response::ErrorReason::{InvalidRegistration, NotRegistered},
  Client, MessageBuilder, NotificationBuilder,
};

pub enum FcmError {
  InvalidRegistration,
  NotRegistered,
  CommonError(anyhow::Error),
}

pub async fn send_by_fcm_client(
  device_registration_id: &str,
  message_title: &str,
  message_body: &str,
) -> Result<(), FcmError> {
  let client = Client::new();
  let mut notification_builder = NotificationBuilder::new();
  notification_builder.title(message_title);
  notification_builder.body(message_body);
  let notification = notification_builder.finalize();

  let mut message_builder =
    MessageBuilder::new(&CONFIG.fcm_api_key, device_registration_id);
  message_builder.notification(notification);

  let result = client.send(message_builder.finalize()).await;
  match result {
    Ok(result) => match result.results {
      Some(results) => {
        if results.len() == 0 {
          return Err(FcmError::CommonError(anyhow::Error::msg(
            "FCM client returned zero size results",
          )));
        };
        if let Some(result_error) = results[0].error {
          match result_error {
            InvalidRegistration => return Err(FcmError::InvalidRegistration),
            NotRegistered => return Err(FcmError::NotRegistered),
            _ => {
              return Err(FcmError::CommonError(anyhow::Error::msg(format!(
                "Notification was not accepted by FCM, reason: {:?}",
                result_error
              ))))
            }
          }
        }
      }
      None => {
        return Err(FcmError::CommonError(anyhow::Error::msg(
          "FCM client has no results set",
        )))
      }
    },
    Err(err) => return Err(FcmError::CommonError(anyhow::Error::from(err))),
  }
  Ok(())
}
