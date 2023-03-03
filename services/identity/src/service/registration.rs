use super::*;
pub struct RegistrationState {
  user_id: String,
  username: String,
  signing_public_key: String,
  pub pake_state: Option<ServerRegistration<Cipher>>,
  session_initialization_info: HashMap<String, String>,
}

pub async fn handle_registration_request(
  message: Option<Result<RegistrationRequest, Status>>,
  client: &DatabaseClient,
  tx: mpsc::Sender<Result<RegistrationResponse, Status>>,
) -> Result<RegistrationState, Status> {
  match message {
    Some(Ok(RegistrationRequest {
      data:
        Some(PakeRegistrationRequestAndUserId(
          pake_registration_request_and_user_id,
        )),
    })) => {
      let get_item_output = client
        .get_item_from_users_table(
          &pake_registration_request_and_user_id.user_id,
        )
        .await;
      match get_item_output {
        Ok(GetItemOutput { item: Some(_), .. }) => {
          error!("User already exists");
          if let Err(e) = tx
            .send(Err(Status::already_exists("User already exists")))
            .await
          {
            error!("Response was dropped: {}", e);
          }
        }
        Err(e) => return Err(handle_db_error(e)),
        _ => {}
      };
      let response_and_state = pake_registration_start(
        &mut OsRng,
        &pake_registration_request_and_user_id.pake_registration_request,
      )
      .await?;
      if let Err(e) = tx.send(Ok(response_and_state.response)).await {
        error!("Response was dropped: {}", e);
      }

      Ok(RegistrationState {
        user_id: pake_registration_request_and_user_id.user_id,
        username: pake_registration_request_and_user_id.username,
        signing_public_key: pake_registration_request_and_user_id
          .signing_public_key,
        pake_state: Some(response_and_state.pake_state),
        session_initialization_info: pake_registration_request_and_user_id
          .session_initialization_info
          .ok_or_else(|| Status::invalid_argument("Invalid message"))?
          .info,
      })
    }
    None | Some(_) => Err(Status::aborted("failure")),
  }
}

pub async fn handle_registration_upload_and_credential_request(
  message: Option<Result<RegistrationRequest, Status>>,
  tx: mpsc::Sender<Result<RegistrationResponse, Status>>,
  client: &DatabaseClient,
  registration_state: &RegistrationState,
  pake_state: ServerRegistration<Cipher>,
) -> Result<ServerLogin<Cipher>, Status> {
  match message {
    Some(Ok(RegistrationRequest {
      data:
        Some(PakeRegistrationUploadAndCredentialRequest(
          pake_registration_upload_and_credential_request,
        )),
    })) => {
      let response_and_state = match pake_registration_finish(
        &registration_state.user_id,
        client,
        &pake_registration_upload_and_credential_request
          .pake_registration_upload,
        Some(pake_state),
        &registration_state.username,
        &registration_state.signing_public_key,
        &registration_state.session_initialization_info,
      )
      .await
      {
        Ok(_) => {
          pake_login_start(
            client,
            &registration_state.user_id,
            &pake_registration_upload_and_credential_request
              .pake_credential_request,
          )
          .await?
        }

        Err(e) => {
          return Err(e);
        }
      };
      let registration_response = RegistrationResponse {
        data: Some(PakeRegistrationLoginResponse(response_and_state.response)),
      };
      if let Err(e) = tx.send(Ok(registration_response)).await {
        error!("Response was dropped: {}", e);
        Err(Status::aborted("failure"))
      } else {
        Ok(response_and_state.pake_state)
      }
    }
    None | Some(_) => Err(Status::aborted("failure")),
  }
}

pub async fn handle_credential_finalization(
  message: Option<Result<RegistrationRequest, Status>>,
  tx: mpsc::Sender<Result<RegistrationResponse, Status>>,
  client: &DatabaseClient,
  registration_state: &RegistrationState,
  server_login: ServerLogin<Cipher>,
) -> Result<(), Status> {
  match message {
    Some(Ok(RegistrationRequest {
      data:
        Some(PakeRegistrationCredentialFinalization(pake_credential_finalization)),
    })) => {
      let login_finish_result = pake_login_finish(
        &registration_state.user_id,
        &registration_state.signing_public_key,
        client,
        server_login,
        &pake_credential_finalization,
        &mut OsRng,
        PakeWorkflow::Registration,
        &registration_state.session_initialization_info,
      )
      .await
      .map(|pake_login_response| RegistrationResponse {
        data: Some(PakeRegistrationLoginResponse(pake_login_response)),
      });
      if let Err(e) = tx.send(login_finish_result).await {
        error!("Response was dropped: {}", e);
        return Err(Status::aborted("failure"));
      }
      Ok(())
    }
    Some(_) | None => Err(Status::aborted("failure")),
  }
}
