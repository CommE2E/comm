use super::*;
pub struct LoginState {
  user_id: String,
  signing_public_key: String,
  pake_state: ServerLogin<Cipher>,
}
pub async fn handle_login_request(
  message: Option<Result<LoginRequest, Status>>,
  tx: mpsc::Sender<Result<LoginResponse, Status>>,
  client: &DatabaseClient,
) -> Result<Option<LoginState>, Status> {
  match message {
    Some(Ok(LoginRequest {
      data: Some(WalletLoginRequest(req)),
    })) => {
      let wallet_login_result =
        wallet_login_helper(client, req, &mut OsRng).await;
      if let Err(e) = tx.send(wallet_login_result).await {
        error!("Response was dropped: {}", e);
        Err(Status::aborted("failure"))
      } else {
        Ok(None)
      }
    }
    Some(Ok(LoginRequest {
      data:
        Some(PakeLoginRequest(PakeLoginRequestStruct {
          data:
            Some(PakeCredentialRequestAndUserId(
              pake_credential_request_and_user_id,
            )),
        })),
    })) => {
      let response_and_state = pake_login_start(
        client,
        &pake_credential_request_and_user_id.user_id,
        &pake_credential_request_and_user_id.pake_credential_request,
      )
      .await?;
      let login_response = LoginResponse {
        data: Some(PakeLoginResponse(response_and_state.response)),
      };
      if let Err(e) = tx.send(Ok(login_response)).await {
        error!("Response was dropped: {}", e);
        return Err(Status::aborted("failure"));
      }

      Ok(Some(LoginState {
        user_id: pake_credential_request_and_user_id.user_id,
        signing_public_key: pake_credential_request_and_user_id
          .signing_public_key,
        pake_state: response_and_state.pake_state,
      }))
    }
    Some(_) | None => Err(Status::aborted("failure")),
  }
}

pub async fn handle_credential_finalization(
  message: Option<Result<LoginRequest, Status>>,
  tx: mpsc::Sender<Result<LoginResponse, Status>>,
  client: DatabaseClient,
  login_state: LoginState,
) -> Result<(), Status> {
  match message {
    Some(Ok(LoginRequest {
      data:
        Some(PakeLoginRequest(PakeLoginRequestStruct {
          data: Some(PakeCredentialFinalization(pake_credential_finalization)),
        })),
    })) => {
      let login_finish_result = pake_login_finish(
        &login_state.user_id,
        &login_state.signing_public_key,
        &client,
        login_state.pake_state,
        &pake_credential_finalization,
        &mut OsRng,
        PakeWorkflow::Login,
      )
      .await
      .map(|pake_login_response| LoginResponse {
        data: Some(PakeLoginResponse(pake_login_response)),
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
