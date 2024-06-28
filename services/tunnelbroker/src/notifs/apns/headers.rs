use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub enum PushType {
  /// The push type for notifications that trigger a user interaction,
  /// for example, an alert, badge, or sound.
  #[default]
  Alert,
  /// The push type for notifications that deliver content in the background,
  /// and don’t trigger any user interactions.
  Background,
  /// The push type for notifications that request a user’s location.
  Location,
  /// The push type for notifications that provide information about
  /// an incoming Voice-over-IP (VoIP) call.
  Voip,
  /// The push type for notifications that contain update information for a
  /// watchOS app’s complications.
  Complication,
  /// The push type to signal changes to a File Provider extension.
  FileProvider,
  /// The push type for notifications that tell managed devices to contact the
  /// MDM server.
  Mdm,
  /// The push type to signal changes to a live activity session.
  LiveActivity,
  /// The push type for notifications that provide information about updates to
  /// your application’s push to talk services.
  PushToTalk,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub struct NotificationHeaders {
  /// The value of this header must accurately reflect the contents of your
  /// notification’s payload. If there’s a mismatch, or if the header is
  /// missing on required systems, APNs may return an error, delay the
  /// delivery of the notification, or drop it altogether.
  pub apns_push_type: Option<PushType>,

  /// A canonical UUID that’s the unique ID for the notification.
  pub apns_id: Option<String>,

  /// The date at which the notification is no longer valid. This value
  /// is a UNIX epoch expressed in seconds (UTC). If the value is nonzero,
  /// APNs stores the notification and tries to deliver it at least once,
  /// repeating the attempt as needed until the specified date. If the value
  /// is 0, APNs attempts to deliver the notification only once and doesn’t
  /// store it.
  pub apns_expiration: Option<u64>,

  /// The priority of the notification. If you omit this header, APNs sets the
  /// notification priority to 10.
  /// 10 - send the notification immediately
  /// 5 - send the notification based on power considerations on the user’s
  ///     device
  /// 1 - prioritize the device’s power considerations over all other
  ///     factors for delivery, and prevent awakening the device.
  pub apns_priority: Option<u64>,

  /// The topic for the notification.
  pub apns_topic: Option<String>,

  /// An identifier you use to merge multiple notifications into a single
  /// notification for the user.
  pub apns_collapse_id: Option<String>,
}
