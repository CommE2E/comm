use crate::cxx_bridge::ffi::MessageItem;

use super::constants;
use super::cxx_bridge::ffi::{
  ackMessageFromAMQP, eraseMessagesFromAMQP, getMessagesFromDatabase,
  getSessionItem, newSessionHandler, removeMessages, sendMessages,
  sessionSignatureHandler, updateSessionItemDeviceToken,
  updateSessionItemIsOnline, waitMessageFromDeliveryBroker, GRPCStatusCodes,
};
use anyhow::Result;
use futures::Stream;
use std::pin::Pin;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use tokio_stream::{wrappers::ReceiverStream, StreamExt};
use tonic::{transport::Server, Request, Response, Status, Streaming};
use tracing::{debug, error};
use tunnelbroker::message_to_tunnelbroker::Data::{
  MessagesToSend, NewNotifyToken, ProcessedMessages,
};
use tunnelbroker::tunnelbroker_service_server::{
  TunnelbrokerService, TunnelbrokerServiceServer,
};
mod tools;
mod tunnelbroker {
  tonic::include_proto!("tunnelbroker");
}

#[derive(Debug, Default)]
struct TunnelbrokerServiceHandlers {}

#[tonic::async_trait]
impl TunnelbrokerService for TunnelbrokerServiceHandlers {
  async fn session_signature(
    &self,
    request: Request<tunnelbroker::SessionSignatureRequest>,
  ) -> Result<Response<tunnelbroker::SessionSignatureResponse>, Status> {
    let result = sessionSignatureHandler(&request.into_inner().device_id);
    if result.grpcStatus.statusCode != GRPCStatusCodes::Ok {
      return Err(tools::create_tonic_status(
        result.grpcStatus.statusCode,
        &result.grpcStatus.errorText,
      ));
    }
    Ok(Response::new(tunnelbroker::SessionSignatureResponse {
      to_sign: result.toSign,
    }))
  }

  async fn new_session(
    &self,
    request: Request<tunnelbroker::NewSessionRequest>,
  ) -> Result<Response<tunnelbroker::NewSessionResponse>, Status> {
    let inner_request = request.into_inner();
    let notify_token = inner_request.notify_token.unwrap_or(String::new());
    if !tunnelbroker::new_session_request::DeviceTypes::is_valid(
      inner_request.device_type,
    ) {
      return Err(tools::create_tonic_status(
        GRPCStatusCodes::InvalidArgument,
        "Unsupported device type",
      ));
    };

    let result = newSessionHandler(
      &inner_request.device_id,
      &inner_request.public_key,
      &inner_request.signature,
      inner_request.device_type,
      &inner_request.device_app_version,
      &inner_request.device_os,
      &notify_token,
    );
    if result.grpcStatus.statusCode != GRPCStatusCodes::Ok {
      return Err(tools::create_tonic_status(
        result.grpcStatus.statusCode,
        &result.grpcStatus.errorText,
      ));
    }
    Ok(Response::new(tunnelbroker::NewSessionResponse {
      session_id: result.sessionID,
    }))
  }

  type MessagesStreamStream = Pin<
    Box<
      dyn Stream<Item = Result<tunnelbroker::MessageToClient, Status>> + Send,
    >,
  >;

  async fn messages_stream(
    &self,
    request: Request<Streaming<tunnelbroker::MessageToTunnelbroker>>,
  ) -> Result<Response<Self::MessagesStreamStream>, Status> {
    let session_id = match request.metadata().get("sessionID") {
      Some(metadata_session_id) => metadata_session_id
        .to_str()
        .expect("metadata session id was not valid UTF8")
        .to_string(),
      None => {
        return Err(Status::invalid_argument(
          "No 'sessionID' in metadata was provided",
        ))
      }
    };
    let session_item = match getSessionItem(&session_id) {
      Ok(database_item) => database_item,
      Err(err) => return Err(Status::unauthenticated(err.what())),
    };

    let (tx, rx) = mpsc::channel(constants::GRPC_TX_QUEUE_SIZE);

    // Through this function, we will write to the output stream from different Tokio
    // tasks and update the device's online status if the write was unsuccessful
    async fn tx_writer<T>(
      session_id: &str,
      channel: &tokio::sync::mpsc::Sender<T>,
      payload: T,
    ) -> Result<(), String> {
      let result = channel.send(payload).await;
      match result {
        Ok(result) => Ok(result),
        Err(err) => {
          if let Err(err) = updateSessionItemIsOnline(&session_id, false) {
            return Err(err.what().to_string());
          }
          return Err(err.to_string());
        }
      }
    }

    if let Err(err) = updateSessionItemIsOnline(&session_id, true) {
      return Err(Status::internal(err.what()));
    }

    // Checking for an empty notif token and requesting the new one from the client
    if session_item.notifyToken.is_empty()
      && session_item.deviceType
        == tunnelbroker::new_session_request::DeviceTypes::Mobile as i32
    {
      let result = tx_writer(
        &session_id,
        &tx,
        Ok(tunnelbroker::MessageToClient {
          data: Some(
            tunnelbroker::message_to_client::Data::NewNotifyTokenRequired(()),
          ),
        }),
      );
      if let Err(err) = result.await {
        debug!(
          "Error while sending notification token request to the client: {}",
          err
        );
      };
    }

    // When a client connects to the bidirectional messages stream, first we check
    // if there are undelivered messages in the database
    let messages_from_database =
      match getMessagesFromDatabase(&session_item.deviceID) {
        Ok(messages) => messages,
        Err(err) => return Err(Status::internal(err.what())),
      };
    if messages_from_database.len() > 0 {
      if let Err(err) = eraseMessagesFromAMQP(&session_item.deviceID) {
        return Err(Status::internal(err.what()));
      };
      let mut messages_to_response = vec![];
      for message in &messages_from_database {
        messages_to_response.push(tunnelbroker::MessageToClientStruct {
          message_id: message.messageID.clone(),
          from_device_id: message.fromDeviceID.clone(),
          payload: message.payload.clone(),
          blob_hashes: vec![message.blobHashes.clone()],
        });
      }
      let result_from_writer = tx_writer(
        &session_id,
        &tx,
        Ok(tunnelbroker::MessageToClient {
          data: Some(tunnelbroker::message_to_client::Data::MessagesToDeliver(
            tunnelbroker::MessagesToDeliver {
              messages: messages_to_response,
            },
          )),
        }),
      );
      if let Err(err) = result_from_writer.await {
        debug!(
          "Error while sending undelivered messages from database to the client: {}",
          err
        );
        return Err(Status::aborted(err));
      };
    }

    // Spawning asynchronous Tokio task with the client pinging loop inside to
    // make sure that the client is online
    tokio::spawn({
      let session_id = session_id.clone();
      let tx = tx.clone();
      async move {
        loop {
          sleep(Duration::from_millis(constants::GRPC_PING_INTERVAL_MS)).await;
          let result = tx_writer(
            &session_id,
            &tx,
            Ok(tunnelbroker::MessageToClient {
              data: Some(tunnelbroker::message_to_client::Data::Ping(())),
            }),
          );
          if let Err(err) = result.await {
            debug!("Failed to write ping to a channel: {}", err);
            break;
          };
        }
      }
    });

    // Spawning asynchronous Tokio task to deliver new messages
    // to the client from delivery broker
    tokio::spawn({
      let device_id = session_item.deviceID.clone();
      let session_id = session_id.clone();
      let tx = tx.clone();
      async move {
        loop {
          let message_to_deliver =
            match waitMessageFromDeliveryBroker(&device_id) {
              Ok(message_item) => message_item,
              Err(err) => {
                error!(
                  "Error on waiting messages from DeliveryBroker: {}",
                  err.what()
                );
                return;
              }
            };
          let writer_result = tx_writer(
            &session_id,
            &tx,
            Ok(tunnelbroker::MessageToClient {
              data: Some(
                tunnelbroker::message_to_client::Data::MessagesToDeliver(
                  tunnelbroker::MessagesToDeliver {
                    messages: vec![tunnelbroker::MessageToClientStruct {
                      message_id: message_to_deliver.messageID,
                      from_device_id: message_to_deliver.fromDeviceID,
                      payload: message_to_deliver.payload,
                      blob_hashes: vec![message_to_deliver.blobHashes],
                    }],
                  },
                ),
              ),
            }),
          );
          if let Err(err) = writer_result.await {
            debug!("Error on writing to the stream: {}", err);
            return;
          };
          if let Err(err) = ackMessageFromAMQP(message_to_deliver.deliveryTag) {
            debug!("Error on message acknowledgement in AMQP queue: {}", err);
            return;
          };
        }
      }
    });

    let mut input_stream = request.into_inner();
    // Spawning asynchronous Tokio task for handling incoming messages from the client
    tokio::spawn(async move {
      while let Some(result) = input_stream.next().await {
        if let Err(err) = result {
          debug!("Error in input stream: {}", err);
          break;
        }
        if let Some(message_data) = result.unwrap().data {
          match message_data {
            NewNotifyToken(new_token) => {
              if let Err(err) =
                updateSessionItemDeviceToken(&session_id, &new_token)
              {
                error!(
                  "Error in updating the device notification token in the database: {}",
                  err.what()
                );
                let writer_result = tx_writer(
                  &session_id,
                  &tx,
                  Err(
                    Status::internal(
                      "Error in updating the device notification token in the database"
                    )
                  ),
                );
                if let Err(err) = writer_result.await {
                  debug!(
                    "Failed to write internal error to a channel: {}",
                    err
                  );
                };
              }
            }
            MessagesToSend(messages_to_send) => {
              let mut messages_vec = vec![];
              for message in messages_to_send.messages {
                messages_vec.push(MessageItem {
                  messageID: String::new(),
                  fromDeviceID: session_item.deviceID.clone(),
                  toDeviceID: message.to_device_id,
                  payload: message.payload,
                  blobHashes: String::new(),
                  deliveryTag: 0,
                });
              }
              let messages_ids = match sendMessages(&messages_vec) {
                Err(err) => {
                  error!("Error on sending messages: {}", err.what());
                  return;
                }
                Ok(ids) => ids,
              };
              if let Err(err) = tx_writer(
                &session_id,
                &tx,
                Ok(tunnelbroker::MessageToClient {
                  data: Some(
                    tunnelbroker::message_to_client::Data::ProcessedMessages(
                      tunnelbroker::ProcessedMessages {
                        message_id: messages_ids,
                      },
                    ),
                  ),
                }),
              )
              .await
              {
                debug!(
                  "Error on sending back processed messages IDs to the stream: {}",
                err);
              };
            }
            ProcessedMessages(processed_messages) => {
              if let Err(err) = removeMessages(
                &session_item.deviceID,
                &processed_messages.message_id,
              ) {
                error!(
                  "Error removing messages from the database: {}",
                  err.what()
                );
              };
            }
          }
        }
      }
      if let Err(err) = updateSessionItemIsOnline(&session_id, false) {
        error!(
          "Error in updating the session online state in the database: {}",
          err.what()
        );
      }
    });

    let output_stream = ReceiverStream::new(rx);
    Ok(Response::new(
      Box::pin(output_stream) as Self::MessagesStreamStream
    ))
  }

  // These empty old API handlers are deprecated and should be removed.
  // They are implemented only to fix the building process.
  async fn send(
    &self,
    _request: Request<tunnelbroker::SendRequest>,
  ) -> Result<Response<()>, Status> {
    Err(Status::cancelled("Deprecated"))
  }

  type GetStream = Pin<
    Box<dyn Stream<Item = Result<tunnelbroker::GetResponse, Status>> + Send>,
  >;
  async fn get(
    &self,
    _request: Request<tunnelbroker::GetRequest>,
  ) -> Result<Response<Self::GetStream>, Status> {
    Err(Status::cancelled("Deprecated"))
  }
}

pub async fn run_grpc_server() -> Result<()> {
  let addr = format!("[::1]:{}", constants::GRPC_SERVER_PORT).parse()?;
  Server::builder()
    .add_service(TunnelbrokerServiceServer::new(
      TunnelbrokerServiceHandlers::default(),
    ))
    .serve(addr)
    .await?;
  Ok(())
}
