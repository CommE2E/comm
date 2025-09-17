use crate::config::CONFIG;
use crate::constants::error_types;
use crate::notifs::apns::{APNsClient, APNsNotif};
use crate::notifs::fcm::firebase_message::FCMMessage;
use crate::notifs::fcm::FCMClient;
use crate::notifs::web_push::{WebPushClient, WebPushNotif};
use crate::notifs::wns::{WNSClient, WNSNotif};
use ::web_push::WebPushError;
use tracing::{error, info};

#[derive(derive_more::From)]
pub enum Notif {
  APNs(APNsNotif),
  Fcm(FCMMessage),
  WebPush(WebPushNotif),
  Wns(WNSNotif),
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum NotifClientError {
  APNs(super::apns::error::Error),
  Fcm(super::fcm::error::Error),
  WebPush(super::web_push::error::Error),
  Wns(super::wns::error::Error),
  #[display(fmt = "Notif client not initialized: {}", _0)]
  MissingClient(#[error(ignore)] super::NotifType),
}

impl NotifClientError {
  pub fn should_invalidate_token(&self) -> bool {
    use super::apns::error::Error as APNS;
    use super::fcm::error::Error as FCM;
    use super::web_push::error::Error as WEB;
    use super::wns::error::Error as WNS;
    match self {
      Self::APNs(error) => {
        matches!(error, APNS::ResponseError(body) if body.reason.should_invalidate_token())
      }
      Self::Fcm(FCM::FCMError(e)) => e.should_invalidate_token(),
      Self::WebPush(WEB::WebPush(web_err)) => {
        use WebPushError::{EndpointNotFound, EndpointNotValid};
        matches!(web_err, EndpointNotValid(_) | EndpointNotFound(_))
      }
      Self::Wns(WNS::WNSNotification(e)) => e.should_invalidate_token(),
      _ => false,
    }
  }
}

/// Base internal structure for direct communicationn with notif providers.
/// Does not handle device token management.
#[derive(Clone)]
pub(super) struct BaseNotifClient {
  apns: Option<APNsClient>,
  fcm: Option<FCMClient>,
  web_push: Option<WebPushClient>,
  wns: Option<WNSClient>,
}

macro_rules! create_client {
  ($client:ident, $config:expr, $name:expr, $error_type: ident) => {{
    let created_client = match $config {
      Some(config) => match $client::new(&config) {
        Ok(client_instance) => {
          info!("{} client created successfully", $name);
          Some(client_instance)
        }
        Err(err) => {
          error!(
            errorType = $error_type,
            "Error creating {} client: {}", $name, err
          );
          None
        }
      },
      None => {
        error!(errorType = $error_type, "{} config is missing", $name);
        None
      }
    };

    created_client
  }};
}

impl BaseNotifClient {
  pub(super) fn new() -> Self {
    use error_types::{APNS_ERROR, FCM_ERROR, WEB_PUSH_ERROR, WNS_ERROR};

    let apns_cfg = &CONFIG.apns_config;
    let fcm_cfg = &CONFIG.fcm_config;
    let web_cfg = &CONFIG.web_push_config;
    let wns_cfg = &CONFIG.wns_config;

    let apns = create_client!(APNsClient, apns_cfg, "APNs", APNS_ERROR);
    let fcm = create_client!(FCMClient, fcm_cfg, "FCM", FCM_ERROR);
    let wns = create_client!(WNSClient, wns_cfg, "WNS", WNS_ERROR);
    let web_push =
      create_client!(WebPushClient, web_cfg, "Web Push", WEB_PUSH_ERROR);

    Self {
      apns,
      fcm,
      web_push,
      wns,
    }
  }

  pub(super) async fn send_notif(
    &self,
    notif: Notif,
  ) -> Result<(), NotifClientError> {
    use super::NotifType as ClientType;
    use NotifClientError::MissingClient;

    match notif {
      Notif::APNs(apns_notif) => {
        let Some(apns) = &self.apns else {
          return Err(MissingClient(ClientType::APNs));
        };
        apns.send(apns_notif).await?;
      }
      Notif::Fcm(fcm_message) => {
        let Some(fcm) = &self.fcm else {
          return Err(MissingClient(ClientType::FCM));
        };
        fcm.send(fcm_message).await?;
      }
      Notif::WebPush(web_push_notif) => {
        let Some(web_client) = &self.web_push else {
          return Err(MissingClient(ClientType::WebPush));
        };
        web_client.send(web_push_notif).await?;
      }

      Notif::Wns(wns_notif) => {
        let Some(wns) = &self.wns else {
          return Err(MissingClient(ClientType::WNS));
        };
        wns.send(wns_notif).await?;
      }
    };
    Ok(())
  }
}
