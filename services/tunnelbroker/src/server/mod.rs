use super::constants;
use super::cxx_bridge::ffi::{
  getSessionItem, newSessionHandler, sessionSignatureHandler, GRPCStatusCodes,
};
use anyhow::Result;
use futures::Stream;
use std::pin::Pin;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{transport::Server, Request, Response, Status, Streaming};
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
    let _session_item = match getSessionItem(&session_id) {
      Ok(database_item) => database_item,
      Err(err) => return Err(Status::unauthenticated(err.what())),
    };

    let (_tx, rx) = mpsc::channel(constants::GRPC_TX_QUEUE_SIZE);

    let output_stream = ReceiverStream::new(rx);
    Ok(Response::new(
      Box::pin(output_stream) as Self::MessagesStreamStream
    ))
  }

  // These empty old API handlers are deprecated and should be removed.
  // They are implemented only to fix the building process.
  async fn check_if_primary_device_online(
    &self,
    _request: Request<tunnelbroker::CheckRequest>,
  ) -> Result<Response<tunnelbroker::CheckResponse>, Status> {
    Err(Status::cancelled("Deprecated"))
  }

  async fn become_new_primary_device(
    &self,
    _request: Request<tunnelbroker::NewPrimaryRequest>,
  ) -> Result<Response<tunnelbroker::NewPrimaryResponse>, Status> {
    Err(Status::cancelled("Deprecated"))
  }

  async fn send_pong(
    &self,
    _request: Request<tunnelbroker::PongRequest>,
  ) -> Result<Response<()>, Status> {
    Err(Status::cancelled("Deprecated"))
  }

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
