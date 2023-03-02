use aws_sdk_dynamodb::output::GetItemOutput;
use comm_opaque::Cipher;
use opaque_ke::{ServerLogin, ServerRegistration};
use rand::rngs::OsRng;
use tokio::sync::mpsc;
use tokio_stream::StreamExt;
use tonic::Streaming;
use tracing::{debug, error, info};

use super::proto::{
  update_user_response, PakeRegistrationUploadAndCredentialRequest,
};
use crate::service::proto::pake_login_response::Data::AccessToken;
use crate::service::proto::update_user_response::Data::PakeLoginResponse;
use crate::service::proto::update_user_response::Data::PakeRegistrationResponse;
use crate::service::proto::PakeRegistrationRequestAndUserId;
use crate::service::PakeLoginResponseStruct;
use crate::token::AuthType;
use crate::{database::DatabaseClient, pake_grpc};

use super::{
  handle_db_error, proto::update_user_request, Status, UpdateUserRequest,
  UpdateUserResponse,
};
use super::{pake_login_start, put_token_helper};

async fn send_to_client(
  tx: &tokio::sync::mpsc::Sender<Result<UpdateUserResponse, Status>>,
  response: Result<UpdateUserResponse, Status>,
) -> Result<(), Status> {
  let transport_result = match response {
    Ok(message) => tx.send(Ok(message)).await,
    Err(status) => {
      error!("{}", status.message());
      tx.send(Err(status)).await
    }
  };

  transport_result.map_err(|_| Status::internal("gRPC connection dropped"))
}

pub(crate) async fn handle_server_update_user_messages(
  in_stream: Streaming<UpdateUserRequest>,
  client: DatabaseClient,
  tx: tokio::sync::mpsc::Sender<Result<UpdateUserResponse, Status>>,
) {
  match attempt_update_user(in_stream, &client, &tx).await {
    Ok(user_id) => info!("Successfully updated user {}", user_id),
    // Attempt to send client the failure to receive immediate feedback
    Err(e) => match send_to_client(&tx, Err(e)).await {
      Ok(_) => debug!("Attempted to inform user of failed update"),
      Err(_) => return,
    },
  };
}

async fn attempt_update_user(
  mut in_stream: Streaming<UpdateUserRequest>,
  client: &DatabaseClient,
  tx: &tokio::sync::mpsc::Sender<Result<UpdateUserResponse, Status>>,
) -> Result<String, Status> {
  let first_message = in_stream.next().await;

  let (request, registration_state) =
    handle_registration_request(first_message, client, tx).await?;

  let second_message = in_stream.next().await;
  let registration_upload = get_registration_upload(second_message)?;
  let server_login = handle_registration_upload_and_credential_request(
    registration_upload,
    tx,
    &client,
    &request,
    registration_state,
  )
  .await?;

  let third_message = in_stream.next().await;
  let finalization_payload = get_finalization_message(third_message)?;
  handle_credential_finalization(
    finalization_payload,
    tx,
    client,
    &request,
    server_login,
  )
  .await?;

  Ok(request.user_id)
}

pub async fn handle_registration_request(
  message: Option<Result<UpdateUserRequest, Status>>,
  client: &DatabaseClient,
  tx: &mpsc::Sender<Result<UpdateUserResponse, Status>>,
) -> Result<
  (PakeRegistrationRequestAndUserId, ServerRegistration<Cipher>),
  Status,
> {
  let request = get_register_request(message)?;
  user_exists(&request.user_id, &client).await?;
  let server_registration_start_result =
    pake_grpc::server_registration_start(&request.pake_registration_request)?;
  let server_start_payload =
    server_registration_start_result.message.serialize();
  let server_start_response = UpdateUserResponse {
    data: Some(PakeRegistrationResponse(server_start_payload)),
  };
  send_to_client(&tx, Ok(server_start_response)).await?;

  Ok((request, server_registration_start_result.state))
}

fn get_register_request(
  message: Option<Result<UpdateUserRequest, Status>>,
) -> Result<PakeRegistrationRequestAndUserId, Status> {
  match message {
    Some(Ok(UpdateUserRequest {
      data: Some(update_user_request::Data::Request(request)),
    })) => Ok(request),
    e => Err(Status::invalid_argument(format!(
      "Expected to recieve registration request, but instead recieved {:?}",
      e
    ))),
  }
}

fn get_finalization_message(
  message: Option<Result<UpdateUserRequest, Status>>,
) -> Result<Vec<u8>, Status> {
  match message {
    Some(Ok(UpdateUserRequest {
      data: Some(update_user_request::Data::PakeLoginFinalizationMessage(request)),
    })) => Ok(request),
    e => Err(Status::invalid_argument(format!(
      "Expected to recieve login finalization message, but instead recieved {:?}",
      e
    ))),
  }
}

async fn user_exists(
  user_id: &str,
  client: &DatabaseClient,
) -> Result<bool, Status> {
  match client
    .get_item_from_users_table(&user_id)
    .await
    .map_err(handle_db_error)
  {
    Ok(GetItemOutput { item: Some(_), .. }) => Ok(true),
    Ok(GetItemOutput { item: None, .. }) => {
      return Err(Status::not_found("Unable to find user: {}"))
    }
    Err(e) => Err(e),
  }
}

pub async fn handle_registration_upload_and_credential_request(
  message: PakeRegistrationUploadAndCredentialRequest,
  tx: &mpsc::Sender<Result<UpdateUserResponse, Status>>,
  client: &DatabaseClient,
  request_and_user_info: &PakeRegistrationRequestAndUserId,
  pake_state: ServerRegistration<Cipher>,
) -> Result<ServerLogin<Cipher>, Status> {
  pake_registration_finish(
    &request_and_user_info.user_id,
    client,
    &message.pake_registration_upload,
    pake_state,
  )
  .await?;
  let response_and_state = pake_login_start(
    client,
    &request_and_user_info.user_id,
    &message.pake_credential_request,
  )
  .await?;

  let registration_response = UpdateUserResponse {
    data: Some(PakeLoginResponse(response_and_state.response)),
  };

  send_to_client(tx, Ok(registration_response)).await?;
  Ok(response_and_state.pake_state)
}

async fn pake_registration_finish(
  user_id: &str,
  client: &DatabaseClient,
  registration_upload_bytes: &Vec<u8>,
  server_registration: ServerRegistration<Cipher>,
) -> Result<(), Status> {
  if user_id.is_empty() {
    error!("Incomplete data: user ID not provided");
    return Err(Status::aborted("user not found"));
  }
  let server_registration_finish_result =
    pake_grpc::server_registration_finish(
      server_registration,
      registration_upload_bytes,
    )?;

  client
    .update_users_table(
      user_id.to_string(),
      None,
      Some(server_registration_finish_result),
      None,
    )
    .await
    .map_err(handle_db_error)?;
  Ok(())
}

fn get_registration_upload(
  message: Option<Result<UpdateUserRequest, Status>>,
) -> Result<
  crate::service::proto::PakeRegistrationUploadAndCredentialRequest,
  Status,
> {
  match message {
    Some(Ok(UpdateUserRequest {
      data:
        Some(
          update_user_request::Data::PakeRegistrationUploadAndCredentialRequest(
            upload,
          ),
        ),
    })) => Ok(upload),
    e => Err(Status::invalid_argument(format!(
      "Expected to recieve registration upload, but instead recieved {:?}",
      e
    ))),
  }
}

pub async fn handle_credential_finalization(
  finalization_payload: Vec<u8>,
  tx: &mpsc::Sender<Result<UpdateUserResponse, Status>>,
  client: &DatabaseClient,
  request_and_user_info: &PakeRegistrationRequestAndUserId,
  server_login: ServerLogin<Cipher>,
) -> Result<(), Status> {
  let login_finish_result = pake_login_finish(
    &request_and_user_info.user_id,
    &request_and_user_info.signing_public_key,
    client,
    server_login,
    &finalization_payload,
  )
  .await?;
  let response = UpdateUserResponse {
    data: Some(update_user_response::Data::PakeLoginResponse(
      login_finish_result,
    )),
  };
  send_to_client(tx, Ok(response)).await
}

async fn pake_login_finish(
  user_id: &str,
  signing_public_key: &str,
  client: &DatabaseClient,
  server_login: ServerLogin<Cipher>,
  pake_credential_finalization: &Vec<u8>,
) -> Result<PakeLoginResponseStruct, Status> {
  if user_id.is_empty() {
    error!("Incomplete data: user ID {}", user_id);
    return Err(Status::aborted("user not found"));
  }

  pake_grpc::server_login_finish(server_login, pake_credential_finalization)?;
  let access_token = put_token_helper(
    client,
    AuthType::Password,
    user_id,
    signing_public_key,
    &mut OsRng,
  )
  .await?;
  Ok(PakeLoginResponseStruct {
    data: Some(AccessToken(access_token)),
  })
}
