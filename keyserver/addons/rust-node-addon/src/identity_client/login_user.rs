use super::*;

#[napi]
#[instrument(skip_all)]
async fn login_user_pake(
  user_id: String,
  signing_public_key: String,
  password: String,
  session_initialization_info: HashMap<String, String>,
) -> Result<String> {
  let channel = Channel::from_static(&IDENTITY_SERVICE_SOCKET_ADDR)
    .connect()
    .await
    .map_err(|_| {
      Error::new(
        Status::GenericFailure,
        "Unable to connect to identity service".to_string(),
      )
    })?;
  let token: MetadataValue<_> = AUTH_TOKEN
    .parse()
    .map_err(|_| Error::from_status(Status::GenericFailure))?;
  let mut identity_client =
    IdentityServiceClient::with_interceptor(channel, |mut req: Request<()>| {
      req.metadata_mut().insert("authorization", token.clone());
      Ok(req)
    });

  // Create a LoginRequest channel and use ReceiverStream to turn the
  // MPSC receiver into a Stream for outbound messages
  let (tx, rx) = mpsc::channel(1);
  let stream = ReceiverStream::new(rx);
  let request = Request::new(stream);

  // `response` is the Stream for inbound messages
  let mut response = identity_client
    .login_user(request)
    .await
    .map_err(|_| Error::from_status(Status::GenericFailure))?
    .into_inner();

  // Start PAKE login on client and send initial login request to Identity
  // service
  let mut client_rng = OsRng;
  let client_login_start_result = pake_login_start(&mut client_rng, &password)?;
  let login_request = LoginRequest {
    data: Some(PakeLoginRequest(PakeLoginRequestStruct {
      data: Some(PakeCredentialRequestAndUserId(
        PakeCredentialRequestAndUserIdStruct {
          user_id,
          signing_public_key,
          pake_credential_request: client_login_start_result
            .message
            .serialize()
            .map_err(|e| {
              error!("Could not serialize credential request: {}", e);
              Error::new(Status::GenericFailure, e.to_string())
            })?,
          session_initialization_info: Some(SessionInitializationInfo {
            info: session_initialization_info,
          }),
        },
      )),
    })),
  };

  send_to_mpsc(tx.clone(), login_request).await?;

  // Handle responses from Identity service sequentially, making sure we get
  // messages in the correct order

  // Finish PAKE login; send final login request to Identity service
  let message = response.message().await.map_err(|e| {
    error!("Received an error from inbound message stream: {}", e);
    Error::from_status(Status::GenericFailure)
  })?;
  handle_login_credential_response(
    message,
    client_login_start_result.state,
    tx,
  )
  .await?;

  // Return access token
  let message = response.message().await.map_err(|e| {
    error!("Received an error from inbound message stream: {}", e);
    Error::from_status(Status::GenericFailure)
  })?;
  handle_login_token_response(message)
}

async fn handle_login_credential_response(
  message: Option<LoginResponse>,
  client_login: ClientLogin<Cipher>,
  tx: mpsc::Sender<LoginRequest>,
) -> Result<(), Status> {
  if let Some(LoginResponse {
    data:
      Some(LoginPakeLoginResponse(PakeLoginResponseStruct {
        data: Some(PakeCredentialResponse(credential_response_bytes)),
      })),
  }) = message
  {
    let login_request = LoginRequest {
      data: Some(PakeLoginRequest(PakeLoginRequestStruct {
        data: Some(LoginPakeCredentialFinalization(
          pake_login_finish(&credential_response_bytes, client_login)?
            .serialize()
            .map_err(|e| {
              error!("Could not serialize credential request: {}", e);
              Error::from_status(Status::GenericFailure)
            })?,
        )),
      })),
    };
    send_to_mpsc(tx, login_request).await
  } else {
    Err(handle_unexpected_response(message))
  }
}

fn handle_login_token_response(
  message: Option<LoginResponse>,
) -> Result<String, Status> {
  if let Some(LoginResponse {
    data:
      Some(LoginPakeLoginResponse(PakeLoginResponseStruct {
        data: Some(AccessToken(access_token)),
      })),
  }) = message
  {
    Ok(access_token)
  } else {
    Err(handle_unexpected_response(message))
  }
}
