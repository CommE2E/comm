use super::*;

#[napi]
#[instrument(skip_all)]
async fn login_user_wallet(
  user_id: String,
  signing_public_key: String,
  siwe_message: String,
  siwe_signature: String,
  mut session_initialization_info: HashMap<String, String>,
  social_proof: String,
) -> Result<String> {
  let channel = get_identity_service_channel().await?;
  let token: MetadataValue<_> = IDENTITY_SERVICE_CONFIG
    .identity_auth_token
    .parse()
    .map_err(|_| Error::from_status(Status::GenericFailure))?;
  let mut identity_client = IdentityKeyserverServiceClient::with_interceptor(
    channel,
    |mut req: Request<()>| {
      req.metadata_mut().insert("authorization", token.clone());
      Ok(req)
    },
  );

  // Create a LoginRequest channel and use ReceiverStream to turn the
  // MPSC receiver into a Stream for outbound messages
  let (tx, rx) = mpsc::channel(1);
  let stream = ReceiverStream::new(rx);
  let request = Request::new(stream);

  let mut response_stream = identity_client
    .login_user(request)
    .await
    .map_err(|_| Error::from_status(Status::GenericFailure))?
    .into_inner();

  // Start wallet login on client and send initial login request to Identity
  // service
  session_initialization_info.insert("socialProof".to_string(), social_proof);
  let login_request = LoginRequest {
    data: Some(WalletLoginRequest(WalletLoginRequestStruct {
      user_id,
      signing_public_key,
      siwe_message,
      siwe_signature,
      session_initialization_info: Some(SessionInitializationInfo {
        info: session_initialization_info,
      }),
    })),
  };
  if let Err(e) = tx.send(login_request).await {
    error!("Response was dropped: {}", e);
    return Err(Error::from_status(Status::GenericFailure));
  }

  // Return access token
  let message = response_stream.message().await.map_err(|e| {
    error!("Received an error from inbound message stream: {}", e);
    Error::from_status(Status::GenericFailure)
  })?;
  get_wallet_access_token(message)
}

#[napi]
#[instrument(skip_all)]
async fn login_user_pake(
  user_id: String,
  signing_public_key: String,
  password: String,
  session_initialization_info: HashMap<String, String>,
) -> Result<String> {
  let channel = get_identity_service_channel().await?;
  let token: MetadataValue<_> = IDENTITY_SERVICE_CONFIG
    .identity_auth_token
    .parse()
    .map_err(|_| Error::from_status(Status::GenericFailure))?;
  let mut identity_client = IdentityKeyserverServiceClient::with_interceptor(
    channel,
    |mut req: Request<()>| {
      req.metadata_mut().insert("authorization", token.clone());
      Ok(req)
    },
  );

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
  let pake_credential_request =
    client_login_start_result.message.serialize().map_err(|e| {
      error!("Could not serialize credential request: {}", e);
      Error::new(Status::GenericFailure, e.to_string())
    })?;
  let login_request = LoginRequest {
    data: Some(PakeLoginRequest(PakeLoginRequestStruct {
      data: Some(PakeCredentialRequestAndUserId(
        PakeCredentialRequestAndUserIdStruct {
          user_id,
          signing_public_key,
          pake_credential_request,
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
    match e.code() {
      Code::NotFound => {
        Error::new(Status::InvalidArg, "user not found".to_string())
      }
      _ => Error::new(Status::GenericFailure, e.to_string()),
    }
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
    let credential_finalization_bytes =
      pake_login_finish(&credential_response_bytes, client_login)?
        .serialize()
        .map_err(|e| {
          error!("Could not serialize credential request: {}", e);
          Error::from_status(Status::GenericFailure)
        })?;
    let login_request = LoginRequest {
      data: Some(PakeLoginRequest(PakeLoginRequestStruct {
        data: Some(LoginPakeCredentialFinalization(
          credential_finalization_bytes,
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

fn get_wallet_access_token(
  message: Option<LoginResponse>,
) -> Result<String, Status> {
  if let Some(LoginResponse {
    data: Some(WalletLoginResponse(WalletLoginResponseStruct { access_token })),
  }) = message
  {
    Ok(access_token)
  } else {
    Err(handle_unexpected_response(message))
  }
}
