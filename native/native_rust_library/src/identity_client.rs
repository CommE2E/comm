use opaque_ke::{
  ClientLogin, ClientLoginFinishParameters, ClientLoginStartParameters,
  ClientLoginStartResult, ClientRegistration,
  ClientRegistrationFinishParameters, CredentialFinalization,
  CredentialResponse, RegistrationResponse, RegistrationUpload,
};
use rand::{rngs::OsRng, CryptoRng, Rng};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{Request, Status};
use tracing::error;

use crate::identity::{
  login_request::Data::PakeLoginRequest,
  login_request::Data::WalletLoginRequest,
  login_response::Data::PakeLoginResponse as LoginPakeLoginResponse,
  login_response::Data::WalletLoginResponse,
  pake_login_request::Data::PakeCredentialFinalization as LoginPakeCredentialFinalization,
  pake_login_request::Data::PakeCredentialRequestAndUserId,
  pake_login_response::Data::AccessToken,
  pake_login_response::Data::PakeCredentialResponse,
  registration_request::Data::PakeCredentialFinalization as RegistrationPakeCredentialFinalization,
  registration_request::Data::PakeRegistrationRequestAndUserId,
  registration_request::Data::PakeRegistrationUploadAndCredentialRequest,
  registration_response::Data::PakeLoginResponse as RegistrationPakeLoginResponse,
  registration_response::Data::PakeRegistrationResponse, GetUserIdRequest,
  LoginRequest, LoginResponse,
  PakeCredentialRequestAndUserId as PakeCredentialRequestAndUserIdStruct,
  PakeLoginRequest as PakeLoginRequestStruct,
  PakeLoginResponse as PakeLoginResponseStruct,
  PakeRegistrationRequestAndUserId as PakeRegistrationRequestAndUserIdStruct,
  PakeRegistrationUploadAndCredentialRequest as PakeRegistrationUploadAndCredentialRequestStruct,
  RegistrationRequest, RegistrationResponse as RegistrationResponseMessage,
  VerifyUserTokenRequest, WalletLoginRequest as WalletLoginRequestStruct,
  WalletLoginResponse as WalletLoginResponseStruct,
};
use crate::IdentityClient;
use comm_opaque::Cipher;

pub async fn get_user_id(
  mut client: Box<IdentityClient>,
  auth_type: i32,
  user_info: String,
) -> Result<String, Status> {
  Ok(
    client
      .identity_client
      .get_user_id(GetUserIdRequest {
        auth_type,
        user_info,
      })
      .await?
      .into_inner()
      .user_id,
  )
}

pub async fn verify_user_token(
  mut client: Box<IdentityClient>,
  user_id: String,
  signing_public_key: String,
  access_token: String,
) -> Result<bool, Status> {
  Ok(
    client
      .identity_client
      .verify_user_token(VerifyUserTokenRequest {
        user_id,
        signing_public_key,
        access_token,
      })
      .await?
      .into_inner()
      .token_valid,
  )
}

pub async fn register_user(
  mut client: Box<IdentityClient>,
  user_id: String,
  signing_public_key: String,
  username: String,
  password: String,
) -> Result<String, Status> {
  // Create a RegistrationRequest channel and use ReceiverStream to turn the
  // MPSC receiver into a Stream for outbound messages
  let (tx, rx) = mpsc::channel(1);
  let stream = ReceiverStream::new(rx);
  let request = Request::new(stream);

  // `response` is the Stream for inbound messages
  let mut response = client
    .identity_client
    .register_user(request)
    .await?
    .into_inner();

  // Start PAKE registration on client and send initial registration request
  // to Identity service
  let mut client_rng = OsRng;
  let (registration_request, client_registration) = pake_registration_start(
    &mut client_rng,
    user_id,
    &password,
    signing_public_key,
    username,
  )?;
  if let Err(e) = tx.send(registration_request).await {
    error!("Response was dropped: {}", e);
    return Err(Status::aborted("Dropped response"));
  }

  // Handle responses from Identity service sequentially, making sure we get
  // messages in the correct order

  // Finish PAKE registration and begin PAKE login; send the final
  // registration request and initial login request together to reduce the
  // number of trips
  let message = response.message().await?;
  let client_login = handle_registration_response(
    message,
    &mut client_rng,
    client_registration,
    &password,
    tx.clone(),
  )
  .await?;

  // Finish PAKE login; send final login request to Identity service
  let message = response.message().await?;
  handle_registration_credential_response(message, client_login, tx).await?;

  // Return access token
  let message = response.message().await?;
  handle_registration_token_response(message)
}

pub async fn login_user_pake(
  mut client: Box<IdentityClient>,
  user_id: String,
  signing_public_key: String,
  password: String,
) -> Result<String, Status> {
  // Create a LoginRequest channel and use ReceiverStream to turn the
  // MPSC receiver into a Stream for outbound messages
  let (tx, rx) = mpsc::channel(1);
  let stream = ReceiverStream::new(rx);
  let request = Request::new(stream);

  // `response` is the Stream for inbound messages
  let mut response = client
    .identity_client
    .login_user(request)
    .await?
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
              Status::failed_precondition("PAKE failure")
            })?,
        },
      )),
    })),
  };
  if let Err(e) = tx.send(login_request).await {
    error!("Response was dropped: {}", e);
    return Err(Status::aborted("Dropped response"));
  }

  // Handle responses from Identity service sequentially, making sure we get
  // messages in the correct order

  // Finish PAKE login; send final login request to Identity service
  let message = response.message().await?;
  handle_login_credential_response(
    message,
    client_login_start_result.state,
    tx,
  )
  .await?;

  // Return access token
  let message = response.message().await?;
  handle_login_token_response(message)
}

pub async fn login_user_wallet(
  mut client: Box<IdentityClient>,
  user_id: String,
  signing_public_key: String,
  siwe_message: String,
  siwe_signature: Vec<u8>,
) -> Result<String, Status> {
  // Create a LoginRequest channel and use ReceiverStream to turn the
  // MPSC receiver into a Stream for outbound messages
  let (tx, rx) = mpsc::channel(1);
  let stream = ReceiverStream::new(rx);
  let request = Request::new(stream);

  // `response` is the Stream for inbound messages
  let mut response = client
    .identity_client
    .login_user(request)
    .await?
    .into_inner();

  // Start wallet login on client and send initial login request to Identity
  // service
  let login_request = LoginRequest {
    data: Some(WalletLoginRequest(WalletLoginRequestStruct {
      user_id,
      signing_public_key,
      siwe_message,
      siwe_signature,
    })),
  };
  if let Err(e) = tx.send(login_request).await {
    error!("Response was dropped: {}", e);
    return Err(Status::aborted("Dropped response"));
  }

  // Return access token
  let message = response.message().await?;
  handle_wallet_login_response(message)
}

fn pake_registration_start(
  rng: &mut (impl Rng + CryptoRng),
  user_id: String,
  password: &str,
  signing_public_key: String,
  username: String,
) -> Result<(RegistrationRequest, ClientRegistration<Cipher>), Status> {
  let client_registration_start_result =
    ClientRegistration::<Cipher>::start(rng, password.as_bytes()).map_err(
      |e| {
        error!("Failed to start PAKE registration: {}", e);
        Status::failed_precondition("PAKE failure")
      },
    )?;
  let pake_registration_request =
    client_registration_start_result.message.serialize();
  Ok((
    RegistrationRequest {
      data: Some(PakeRegistrationRequestAndUserId(
        PakeRegistrationRequestAndUserIdStruct {
          user_id,
          signing_public_key,
          pake_registration_request,
          username,
        },
      )),
    },
    client_registration_start_result.state,
  ))
}

fn pake_registration_finish(
  rng: &mut (impl Rng + CryptoRng),
  registration_response_bytes: &[u8],
  client_registration: ClientRegistration<Cipher>,
) -> Result<RegistrationUpload<Cipher>, Status> {
  client_registration
    .finish(
      rng,
      RegistrationResponse::deserialize(registration_response_bytes).map_err(
        |e| {
          error!("Could not deserialize registration response bytes: {}", e);
          Status::aborted("Invalid response bytes")
        },
      )?,
      ClientRegistrationFinishParameters::default(),
    )
    .map_err(|e| {
      error!("Failed to finish PAKE registration: {}", e);
      Status::aborted("PAKE failure")
    })
    .map(|res| res.message)
}

fn pake_login_start(
  rng: &mut (impl Rng + CryptoRng),
  password: &str,
) -> Result<ClientLoginStartResult<Cipher>, Status> {
  ClientLogin::<Cipher>::start(
    rng,
    password.as_bytes(),
    ClientLoginStartParameters::default(),
  )
  .map_err(|e| {
    error!("Failed to start PAKE login: {}", e);
    Status::failed_precondition("PAKE failure")
  })
}

fn pake_login_finish(
  credential_response_bytes: &[u8],
  client_login: ClientLogin<Cipher>,
) -> Result<CredentialFinalization<Cipher>, Status> {
  client_login
    .finish(
      CredentialResponse::deserialize(credential_response_bytes).map_err(
        |e| {
          error!("Could not deserialize credential response bytes: {}", e);
          Status::aborted("Invalid response bytes")
        },
      )?,
      ClientLoginFinishParameters::default(),
    )
    .map_err(|e| {
      error!("Failed to finish PAKE login: {}", e);
      Status::aborted("PAKE failure")
    })
    .map(|res| res.message)
}

fn handle_unexpected_response<T: std::fmt::Debug>(
  message: Option<T>,
) -> Status {
  error!("Received an unexpected message: {:?}", message);
  Status::invalid_argument("Invalid response data")
}

async fn handle_registration_response(
  message: Option<RegistrationResponseMessage>,
  client_rng: &mut (impl Rng + CryptoRng),
  client_registration: ClientRegistration<Cipher>,
  password: &str,
  tx: mpsc::Sender<RegistrationRequest>,
) -> Result<ClientLogin<Cipher>, Status> {
  if let Some(RegistrationResponseMessage {
    data: Some(PakeRegistrationResponse(registration_response_bytes)),
    ..
  }) = message
  {
    let pake_registration_upload = pake_registration_finish(
      client_rng,
      &registration_response_bytes,
      client_registration,
    )?
    .serialize();
    let client_login_start_result = pake_login_start(client_rng, password)?;

    // `registration_request` is a gRPC message containing serialized bytes to
    // complete PAKE registration and begin PAKE login
    let registration_request = RegistrationRequest {
      data: Some(PakeRegistrationUploadAndCredentialRequest(
        PakeRegistrationUploadAndCredentialRequestStruct {
          pake_registration_upload,
          pake_credential_request: client_login_start_result
            .message
            .serialize()
            .map_err(|e| {
              error!("Could not serialize credential request: {}", e);
              Status::failed_precondition("PAKE failure")
            })?,
        },
      )),
    };
    if let Err(e) = tx.send(registration_request).await {
      error!("Response was dropped: {}", e);
      return Err(Status::aborted("Dropped response"));
    }
    Ok(client_login_start_result.state)
  } else {
    Err(handle_unexpected_response(message))
  }
}

async fn handle_registration_credential_response(
  message: Option<RegistrationResponseMessage>,
  client_login: ClientLogin<Cipher>,
  tx: mpsc::Sender<RegistrationRequest>,
) -> Result<(), Status> {
  if let Some(RegistrationResponseMessage {
    data:
      Some(RegistrationPakeLoginResponse(PakeLoginResponseStruct {
        data: Some(PakeCredentialResponse(credential_response_bytes)),
      })),
  }) = message
  {
    let registration_request = RegistrationRequest {
      data: Some(RegistrationPakeCredentialFinalization(
        pake_login_finish(&credential_response_bytes, client_login)?
          .serialize()
          .map_err(|e| {
            error!("Could not serialize credential request: {}", e);
            Status::failed_precondition("PAKE failure")
          })?,
      )),
    };
    send_to_mpsc(tx, registration_request).await
  } else {
    Err(handle_unexpected_response(message))
  }
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
              Status::failed_precondition("PAKE failure")
            })?,
        )),
      })),
    };
    send_to_mpsc(tx, login_request).await
  } else {
    Err(handle_unexpected_response(message))
  }
}

fn handle_registration_token_response(
  message: Option<RegistrationResponseMessage>,
) -> Result<String, Status> {
  if let Some(RegistrationResponseMessage {
    data:
      Some(RegistrationPakeLoginResponse(PakeLoginResponseStruct {
        data: Some(AccessToken(access_token)),
      })),
  }) = message
  {
    Ok(access_token)
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

fn handle_wallet_login_response(
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

async fn send_to_mpsc<T>(
  tx: mpsc::Sender<T>,
  request: T,
) -> Result<(), Status> {
  if let Err(e) = tx.send(request).await {
    error!("Response was dropped: {}", e);
    return Err(Status::aborted("Dropped response"));
  }
  Ok(())
}
