use crate::amqp_client::amqp::AmqpConnection;
use crate::constants::error_types;
use comm_lib::aws::ddb::error::SdkError;
use comm_lib::aws::ddb::operation::put_item::PutItemError;
use derive_more;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
use hyper_tungstenite::{tungstenite::Message, WebSocketStream};
use lapin::message::Delivery;
use std::sync::Arc;

use reqwest::Url;
use tokio::io::AsyncRead;
use tokio::io::AsyncWrite;
use tokio::sync::Mutex;
use tracing::{debug, error, info, trace};

use crate::amqp_client::AmqpClient;
use crate::database::{self, DatabaseClient};
use crate::farcaster::FarcasterClient;
use crate::notifs::SessionNotifClient;
use crate::{farcaster, identity};
use tunnelbroker_messages::farcaster::{
  FarcasterAPIRequest, FarcasterAPIResponse, FarcasterAPIResponseData,
  FarcasterAPIResponseError,
};
use tunnelbroker_messages::{
  message_to_device_request_status::MessageSentStatus, session::DeviceTypes,
  DeviceToTunnelbrokerMessage, Heartbeat, MessageToTunnelbroker,
};
use tunnelbroker_messages::{DeviceToTunnelbrokerRequestStatus, Platform};

#[derive(Clone)]
pub struct DeviceInfo {
  pub device_id: String,
  pub notify_token: Option<String>,
  pub device_type: DeviceTypes,
  pub device_app_version: Option<String>,
  pub device_os: Option<String>,
  pub is_authenticated: bool,
}

pub struct WebsocketSession<S> {
  tx: Arc<Mutex<SplitSink<WebSocketStream<S>, Message>>>,
  db_client: DatabaseClient,
  pub device_info: DeviceInfo,
  // Each websocket has an AMQP connection associated with a particular device
  amqp_client: AmqpClient,
  notif_client: SessionNotifClient,
  farcaster_client: FarcasterClient,
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum SessionError {
  InvalidMessage,
  SerializationError(serde_json::Error),
  MessageError(database::MessageErrors),
  AmqpError(lapin::Error),
  InternalError,
  UnauthorizedDevice,
  PersistenceError(SdkError<PutItemError>),
  DatabaseError(comm_lib::database::Error),
  MissingAPNsClient,
  MissingFCMClient,
  MissingWebPushClient,
  MissingWNSClient,
  MissingDeviceToken,
  InvalidDeviceToken,
  InvalidNotifProvider,
  InvalidDeviceTokenUpload,
}

// Parse a session request and retrieve the device information
pub async fn handle_first_message_from_device(
  message: &str,
) -> Result<DeviceInfo, SessionError> {
  let serialized_message =
    serde_json::from_str::<DeviceToTunnelbrokerMessage>(message)?;

  match serialized_message {
    DeviceToTunnelbrokerMessage::ConnectionInitializationMessage(
      mut session_info,
    ) => {
      let device_info = DeviceInfo {
        device_id: session_info.device_id.clone(),
        notify_token: session_info.notify_token.take(),
        device_type: session_info.device_type,
        device_app_version: session_info.device_app_version.take(),
        device_os: session_info.device_os.take(),
        is_authenticated: true,
      };

      // Authenticate device
      debug!("Authenticating device: {}", &session_info.device_id);
      let auth_request = identity::verify_user_access_token(
        &session_info.user_id,
        &device_info.device_id,
        &session_info.access_token,
      )
      .await;

      match auth_request {
        Err(e) => {
          error!(
            errorType = error_types::IDENTITY_ERROR,
            "Failed to complete request to identity service: {:?}", e
          );
          return Err(SessionError::InternalError);
        }
        Ok(false) => {
          info!("Device failed authentication: {}", &session_info.device_id);
          return Err(SessionError::UnauthorizedDevice);
        }
        Ok(true) => {
          debug!(
            "Successfully authenticated device: {}",
            &session_info.device_id
          );
        }
      }

      Ok(device_info)
    }
    DeviceToTunnelbrokerMessage::AnonymousInitializationMessage(
      session_info,
    ) => {
      debug!(
        "Starting unauthenticated session with device: {}",
        &session_info.device_id
      );
      let device_info = DeviceInfo {
        device_id: session_info.device_id,
        device_type: session_info.device_type,
        device_app_version: session_info.device_app_version,
        device_os: session_info.device_os,
        is_authenticated: false,
        notify_token: None,
      };
      Ok(device_info)
    }
    _ => {
      debug!("Received invalid request");
      Err(SessionError::InvalidMessage)
    }
  }
}

pub async fn get_device_info_from_frame(
  frame: Message,
) -> Result<DeviceInfo, SessionError> {
  let device_info = match frame {
    Message::Text(payload) => {
      handle_first_message_from_device(&payload).await?
    }
    _ => {
      debug!("Client sent wrong frame type for establishing connection");
      return Err(SessionError::InvalidMessage);
    }
  };
  Ok(device_info)
}

impl<S: AsyncRead + AsyncWrite + Unpin + Send + 'static> WebsocketSession<S> {
  pub async fn new(
    tx: SplitSink<WebSocketStream<S>, Message>,
    db_client: DatabaseClient,
    device_info: DeviceInfo,
    amqp: AmqpConnection,
    notif_client: SessionNotifClient,
    farcaster_client: FarcasterClient,
  ) -> Result<Self, super::ErrorWithStreamHandle<S>> {
    let amqp_client =
      match AmqpClient::new(db_client.clone(), device_info.clone(), amqp).await
      {
        Ok(client) => client,
        Err(err) => return Err((err, tx)),
      };

    Ok(Self {
      tx: Arc::new(Mutex::new(tx)),
      db_client,
      device_info,
      amqp_client,
      notif_client,
      farcaster_client,
    })
  }

  pub async fn reset_failed_amqp(&mut self) -> Result<(), SessionError> {
    self.amqp_client.reset_failed_amqp().await
  }

  pub async fn handle_message_to_tunnelbroker(
    &self,
    message_to_tunnelbroker: &MessageToTunnelbroker,
  ) -> Result<(), SessionError> {
    match message_to_tunnelbroker {
      MessageToTunnelbroker::SetDeviceToken(token) => {
        self
          .db_client
          .set_device_token(
            &self.device_info.device_id,
            &token.device_token,
            None,
          )
          .await?;
      }
      MessageToTunnelbroker::SetDeviceTokenWithPlatform(
        token_with_platform,
      ) => {
        if matches!(token_with_platform.platform, Platform::Windows) {
          Url::parse(&token_with_platform.device_token)
            .ok()
            .filter(|url| {
              url
                .domain()
                .is_some_and(|domain| domain.ends_with("notify.windows.com"))
            })
            .ok_or_else(|| {
              debug!(
                device_token = &token_with_platform.device_token,
                device_id = &self.device_info.device_id,
                "Invalid Windows device token"
              );
              SessionError::InvalidDeviceTokenUpload
            })?;
        }
        self
          .db_client
          .set_device_token(
            &self.device_info.device_id,
            &token_with_platform.device_token,
            Some(token_with_platform.platform.clone()),
          )
          .await?;
      }
    }

    Ok(())
  }

  pub async fn handle_websocket_frame_from_device(
    &mut self,
    msg: String,
  ) -> Option<String> {
    let serialized_message = match serde_json::from_str::<
      DeviceToTunnelbrokerMessage,
    >(&msg)
    {
      Ok(message) => message,
      Err(_) => {
        error!("Error parsing {}", msg);
        let request_status = DeviceToTunnelbrokerRequestStatus {
          // Information to the client about which message failed to be serialized.
          client_message_ids: vec![MessageSentStatus::SerializationError(msg)],
        };
        return serde_json::to_string(&request_status).ok();
      }
    };

    match serialized_message {
      DeviceToTunnelbrokerMessage::FarcasterAPIRequest(request) => {
        // Spawn Farcaster API request as a background task for parallel processing
        let tx = self.tx.clone();
        let farcaster_client = self.farcaster_client.clone();
        let device_info = self.device_info.clone();

        tokio::spawn(async move {
          let response = Self::handle_websocket_farcaster_request_static(
            &farcaster_client,
            &device_info,
            request,
          )
          .await;

          if let Ok(response_json) = serde_json::to_string(&response) {
            let mut tx_guard = tx.lock().await;
            if let Err(e) = tx_guard.send(Message::Text(response_json)).await {
              if !should_ignore_error(&e) {
                error!(
                  errorType = error_types::WEBSOCKET_ERROR,
                  "Failed to send Farcaster API response to device: {}", e
                );
              }
            }
          }
        });

        // Return immediately without waiting for the API response
        None
      }
      message_from_device => {
        let message_status =
          self.handle_message_from_device(message_from_device).await?;

        let request_status = DeviceToTunnelbrokerRequestStatus {
          client_message_ids: vec![message_status],
        };
        serde_json::to_string(&request_status).ok()
      }
    }
  }

  pub async fn handle_message_from_device(
    &mut self,
    device_to_tunnelbroker_message: DeviceToTunnelbrokerMessage,
  ) -> Option<MessageSentStatus> {
    match device_to_tunnelbroker_message {
      DeviceToTunnelbrokerMessage::Heartbeat(Heartbeat {}) => {
        trace!("Received heartbeat from: {}", self.device_info.device_id);
        None
      }
      DeviceToTunnelbrokerMessage::MessageReceiveConfirmation(confirmation) => {
        for message_id in confirmation.message_ids {
          if let Err(e) = self
            .db_client
            .delete_message(&self.device_info.device_id, &message_id)
            .await
          {
            error!(
              errorType = error_types::DDB_ERROR,
              "Failed to delete message: {}:", e
            );
          }
        }

        None
      }
      DeviceToTunnelbrokerMessage::MessageToDeviceRequest(message_request) => {
        // unauthenticated clients cannot send messages
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send text message. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        debug!("Received message for {}", message_request.device_id);

        let result = self
          .amqp_client
          .handle_message_to_device(&message_request)
          .await;
        Some(MessageSentStatus::from_result(
          &message_request.client_message_id,
          result,
        ))
      }
      DeviceToTunnelbrokerMessage::MessageToTunnelbrokerRequest(
        message_request,
      ) => {
        // unauthenticated clients cannot send messages
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send text message. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        debug!("Received message for Tunnelbroker");

        let Ok(message_to_tunnelbroker) =
          serde_json::from_str(&message_request.payload)
        else {
          return Some(MessageSentStatus::SerializationError(
            message_request.payload,
          ));
        };

        let result = self
          .handle_message_to_tunnelbroker(&message_to_tunnelbroker)
          .await;
        Some(MessageSentStatus::from_result(
          &message_request.client_message_id,
          result,
        ))
      }
      DeviceToTunnelbrokerMessage::APNsNotif(notif) => {
        // unauthenticated clients cannot send notifs
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send text notif. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        self
          .notif_client
          .send_apns_notif(notif, &mut self.amqp_client)
          .await
      }
      DeviceToTunnelbrokerMessage::FCMNotif(notif) => {
        // unauthenticated clients cannot send notifs
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send text notif. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        self
          .notif_client
          .send_fcm_notif(notif, &mut self.amqp_client)
          .await
      }
      DeviceToTunnelbrokerMessage::WebPushNotif(notif) => {
        // unauthenticated clients cannot send notifs
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send web push notif. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        self
          .notif_client
          .send_web_notif(notif, &mut self.amqp_client)
          .await
      }
      DeviceToTunnelbrokerMessage::WNSNotif(notif) => {
        if !self.device_info.is_authenticated {
          debug!(
            "Unauthenticated device {} tried to send WNS notif. Aborting.",
            self.device_info.device_id
          );
          return Some(MessageSentStatus::Unauthenticated);
        }
        self
          .notif_client
          .send_wns_notif(notif, &mut self.amqp_client)
          .await
      }
      _ => {
        error!("Client sent invalid message type");
        Some(MessageSentStatus::InvalidRequest)
      }
    }
  }

  async fn handle_websocket_farcaster_request_static(
    farcaster_client: &FarcasterClient,
    device_info: &DeviceInfo,
    request: FarcasterAPIRequest,
  ) -> FarcasterAPIResponse {
    let request_id = request.request_id.clone();

    if !device_info.is_authenticated {
      debug!(
        "Unauthenticated device {} tried to call Farcaster API. Aborting.",
        device_info.device_id
      );
      return FarcasterAPIResponse {
        request_id,
        response: FarcasterAPIResponseData::Unauthenticated,
      };
    }

    // Handle STREAM method separately
    if matches!(
      request.method,
      tunnelbroker_messages::farcaster::APIMethod::STREAM
    ) {
      let response = match farcaster_client.handle_stream_request(request).await
      {
        Ok(()) => FarcasterAPIResponseData::Success(
          "Message published to stream".to_string(),
        ),
        Err(err) => FarcasterAPIResponseData::Error(err.to_string()),
      };

      return FarcasterAPIResponse {
        request_id,
        response,
      };
    }

    let response = match farcaster_client.api_request(request).await {
      Ok((status, response)) => {
        if status.is_success() {
          FarcasterAPIResponseData::Success(response)
        } else {
          FarcasterAPIResponseData::ErrorResponse(FarcasterAPIResponseError {
            status: status.as_u16() as u32,
            message: response,
          })
        }
      }
      Err(farcaster::error::Error::MissingFarcasterToken) => {
        FarcasterAPIResponseData::MissingFarcasterDCsToken
      }
      Err(farcaster::error::Error::InvalidRequest) => {
        FarcasterAPIResponseData::InvalidRequest
      }
      Err(err) => FarcasterAPIResponseData::Error(err.to_string()),
    };

    FarcasterAPIResponse {
      request_id,
      response,
    }
  }

  pub async fn next_amqp_message(
    &mut self,
  ) -> Option<Result<Delivery, lapin::Error>> {
    self.amqp_client.next_amqp_message().await
  }

  pub async fn send_message_to_device(&mut self, message: Message) {
    let mut tx = self.tx.lock().await;
    if let Err(e) = tx.send(message).await {
      if should_ignore_error(&e) {
        debug!("Ignored error when sending message to device: {e:?}");
        return;
      }
      error!(
        errorType = error_types::WEBSOCKET_ERROR,
        "Failed to send message to device: {}", e
      );
    }
  }

  // Release WebSocket and remove from active connections
  pub async fn close(&mut self) {
    let mut tx = self.tx.lock().await;
    if let Err(e) = tx.close().await {
      debug!("Failed to close WebSocket session: {}", e);
    }

    self.amqp_client.close_connection().await;
  }
}

fn should_ignore_error(err: &hyper_tungstenite::tungstenite::Error) -> bool {
  use hyper_tungstenite::tungstenite::Error as E;
  use std::io::ErrorKind;

  match err {
    E::ConnectionClosed | E::AlreadyClosed => true,
    E::Io(io_error) => match io_error.kind() {
      // The operation failed because a pipe was closed.
      ErrorKind::BrokenPipe => true,
      _ => false,
    },
    _ => false,
  }
}
