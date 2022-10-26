use super::constants;
use super::cxx_bridge::ffi::{sessionSignatureHandler, GRPCStatusCodes};
use anyhow::Result;
use futures::Stream;
use std::pin::Pin;
use tonic::transport::Server;
use tonic::{Request, Response, Status, Streaming};
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
    _request: Request<tunnelbroker::NewSessionRequest>,
  ) -> Result<Response<tunnelbroker::NewSessionResponse>, Status> {
    Err(Status::unimplemented("Not implemented yet"))
  }

  type MessagesStreamStream = Pin<
    Box<
      dyn Stream<Item = Result<tunnelbroker::MessageToClient, Status>> + Send,
    >,
  >;
  async fn messages_stream(
    &self,
    _request: Request<Streaming<tunnelbroker::MessageToTunnelbroker>>,
  ) -> Result<Response<Self::MessagesStreamStream>, Status> {
    Err(Status::unimplemented("Not implemented yet"))
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
