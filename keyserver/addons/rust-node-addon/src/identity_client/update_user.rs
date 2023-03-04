use crate::identity_client::identity as proto;
use crate::identity_client::identity::identity_service_client::IdentityServiceClient;
use crate::identity_client::identity::pake_login_response::Data::AccessToken;
use crate::identity_client::identity::{
  update_user_request, update_user_response, UpdateUserRequest,
  UpdateUserResponse,
};
use comm_opaque::Cipher;
use napi::bindgen_prelude::*;
use opaque_ke::{
  ClientLogin, ClientLoginFinishParameters, ClientLoginStartParameters,
  ClientLoginStartResult, ClientRegistration,
  ClientRegistrationFinishParameters, CredentialFinalization,
  CredentialResponse, RegistrationUpload,
};
use rand::{rngs::OsRng, CryptoRng, Rng};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic;
use tonic::metadata::MetadataValue;
use tracing::{error, instrument};

use super::{get_identity_service_channel, IDENTITY_SERVICE_CONFIG};

#[napi]
#[instrument(skip_all)]
pub async fn update_user(user_id: String, password: String) -> Result<String> {
  let channel = get_identity_service_channel().await?;
  let token: MetadataValue<_> = IDENTITY_SERVICE_CONFIG
    .identity_auth_token
    .parse()
    .map_err(|_| Error::from_status(Status::GenericFailure))?;
  let mut identity_client = IdentityServiceClient::with_interceptor(
    channel,
    |mut req: tonic::Request<()>| {
      req.metadata_mut().insert("authorization", token.clone());
      Ok(req)
    },
  );

  // Create a RegistrationRequest channel and use ReceiverStream to turn the
  // MPSC receiver into a Stream for outbound messages
  let (tx, rx) = mpsc::channel(1);
  let stream = ReceiverStream::new(rx);
  let request = tonic::Request::new(stream);

  // `response` is the Stream for inbound messages
  let mut response = identity_client
    .update_user(request)
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?
    .into_inner();

  // Start PAKE registration on client and send initial registration request
  // to Identity service
  let mut client_rng = OsRng;
  let (registration_request, client_registration) =
    pake_registration_start(&mut client_rng, user_id, &password)?;
  send_to_mpsc(&tx, registration_request).await?;

  // Handle responses from Identity service sequentially, making sure we get
  // messages in the correct order

  // Finish PAKE registration and begin PAKE login; send the final
  // registration request and initial login request together to reduce the
  // number of trips
  let message = response
    .message()
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;
  let registration_response = get_registration_response(message)?;
  let client_login = handle_registration_response(
    &registration_response,
    &mut client_rng,
    client_registration,
    &password,
    &tx,
  )
  .await?;

  // Finish PAKE login; send final login request to Identity service
  let message = response
    .message()
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;
  let credential_response = get_login_credential_response(message)?;
  handle_login_credential_response(&credential_response, client_login, &tx)
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;

  // Return access token
  let message = response
    .message()
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;
  get_login_token_response(message)
}

fn handle_unexpected_response<T: std::fmt::Debug>(message: Option<T>) -> Error {
  error!("Received an unexpected message: {:?}", message);
  Error::from_status(Status::GenericFailure)
}

async fn send_to_mpsc<T>(tx: &mpsc::Sender<T>, request: T) -> Result<()> {
  if let Err(e) = tx.send(request).await {
    error!("Response was dropped: {}", e);
    return Err(Error::from_status(Status::GenericFailure));
  }
  Ok(())
}

fn pake_login_start(
  rng: &mut (impl Rng + CryptoRng),
  password: &str,
) -> Result<ClientLoginStartResult<Cipher>> {
  ClientLogin::<Cipher>::start(
    rng,
    password.as_bytes(),
    ClientLoginStartParameters::default(),
  )
  .map_err(|e| {
    error!("Failed to start PAKE login: {}", e);
    Error::from_status(Status::GenericFailure)
  })
}

fn pake_login_finish(
  credential_response_bytes: &[u8],
  client_login: ClientLogin<Cipher>,
) -> Result<CredentialFinalization<Cipher>> {
  client_login
    .finish(
      CredentialResponse::deserialize(credential_response_bytes).map_err(
        |e| {
          error!("Could not deserialize credential response bytes: {}", e);
          Error::from_status(Status::GenericFailure)
        },
      )?,
      ClientLoginFinishParameters::default(),
    )
    .map_err(|e| {
      error!("Failed to finish PAKE login: {}", e);
      Error::from_status(Status::GenericFailure)
    })
    .map(|res| res.message)
}

fn pake_registration_start(
  rng: &mut (impl Rng + CryptoRng),
  user_id: String,
  password: &str,
) -> Result<(UpdateUserRequest, ClientRegistration<Cipher>)> {
  let client_registration_start_result =
    ClientRegistration::<Cipher>::start(rng, password.as_bytes()).map_err(
      |e| {
        error!("Failed to start PAKE registration: {}", e);
        Error::from_status(Status::GenericFailure)
      },
    )?;
  let pake_registration_request =
    client_registration_start_result.message.serialize();
  Ok((
    UpdateUserRequest {
      data: Some(update_user_request::Data::Request(
        crate::identity_client::identity::PakeRegistrationRequestAndUserId {
          user_id,
          pake_registration_request,
          username: "placeholder-username".to_string(),
          signing_public_key: "placeholder-signing-public-key".to_string(),
          session_initialization_info: None,
        },
      )),
    },
    client_registration_start_result.state,
  ))
}

async fn handle_registration_response(
  registration_reponse_payload: &[u8],
  client_rng: &mut (impl Rng + CryptoRng),
  client_registration: ClientRegistration<Cipher>,
  password: &str,
  tx: &mpsc::Sender<UpdateUserRequest>,
) -> Result<ClientLogin<Cipher>> {
  let pake_registration_upload = pake_registration_finish(
    client_rng,
    &registration_reponse_payload,
    client_registration,
  )?
  .serialize();
  let client_login_start_result = pake_login_start(client_rng, password)?;
  let pake_login_request =
    client_login_start_result.message.serialize().map_err(|e| {
      error!("Could not serialize credential request: {}", e);
      Error::from_status(Status::GenericFailure)
    })?;

  // `registration_request` is a gRPC message containing serialized bytes to
  // complete PAKE registration and begin PAKE login
  let inner_message: update_user_request::Data =
    update_user_request::Data::PakeRegistrationUploadAndCredentialRequest(
      crate::identity_client::identity::PakeRegistrationUploadAndCredentialRequest {
        pake_registration_upload,
        pake_credential_request: pake_login_request,
      },
    );
  let registration_request = UpdateUserRequest {
    data: Some(inner_message),
  };
  send_to_mpsc(tx, registration_request).await?;
  Ok(client_login_start_result.state)
}

fn get_registration_response(
  message: Option<UpdateUserResponse>,
) -> Result<Vec<u8>> {
  match message {
    Some(UpdateUserResponse {
      data:
        Some(update_user_response::Data::PakeRegistrationResponse(
          registration_response_bytes,
        )),
      ..
    }) => Ok(registration_response_bytes),
    _ => {
      error!("Received an unexpected message: {:?}", message);
      Err(Error::from_status(Status::GenericFailure))
    }
  }
}

async fn handle_login_credential_response(
  registration_response_payload: &[u8],
  client_login: ClientLogin<Cipher>,
  tx: &mpsc::Sender<UpdateUserRequest>,
) -> Result<()> {
  let pake_login_finish_result =
    pake_login_finish(&registration_response_payload, client_login)?;
  let login_finish_message =
    pake_login_finish_result.serialize().map_err(|e| {
      error!("Could not serialize credential request: {}", e);
      Error::from_status(Status::GenericFailure)
    })?;
  let registration_request = UpdateUserRequest {
    data: Some(
      proto::update_user_request::Data::PakeLoginFinalizationMessage(
        login_finish_message,
      ),
    ),
  };
  send_to_mpsc(tx, registration_request).await
}

fn get_login_credential_response(
  message: Option<UpdateUserResponse>,
) -> Result<Vec<u8>> {
  match message {
    Some(UpdateUserResponse {
      data:
        Some(update_user_response::Data::PakeLoginResponse(
          proto::PakeLoginResponse {
            data:
              Some(proto::pake_login_response::Data::PakeCredentialResponse(
                bytes,
              )),
          },
        )),
    }) => Ok(bytes),
    _ => Err(handle_unexpected_response(message)),
  }
}

fn get_login_token_response(
  message: Option<UpdateUserResponse>,
) -> Result<String> {
  match message {
    Some(UpdateUserResponse {
      data:
        Some(update_user_response::Data::PakeLoginResponse(
          proto::PakeLoginResponse {
            data: Some(AccessToken(access_token)),
          },
        )),
    }) => Ok(access_token),
    _ => Err(handle_unexpected_response(message)),
  }
}

fn pake_registration_finish(
  rng: &mut (impl Rng + CryptoRng),
  registration_response_bytes: &[u8],
  client_registration: ClientRegistration<Cipher>,
) -> Result<RegistrationUpload<Cipher>> {
  let register_payload =
    opaque_ke::RegistrationResponse::deserialize(registration_response_bytes)
      .map_err(|e| {
      error!("Could not deserialize registration response bytes: {}", e);
      Error::from_status(Status::GenericFailure)
    })?;
  client_registration
    .finish(
      rng,
      register_payload,
      ClientRegistrationFinishParameters::default(),
    )
    .map_err(|e| {
      error!("Failed to finish PAKE registration: {}", e);
      Error::from_status(Status::GenericFailure)
    })
    .map(|res| res.message)
}
