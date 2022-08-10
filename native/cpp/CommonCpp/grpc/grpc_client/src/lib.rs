use lazy_static::lazy_static;
use opaque_ke::{
  ClientLogin, ClientLoginFinishParameters, ClientLoginStartParameters,
  ClientRegistration, ClientRegistrationFinishParameters,
  CredentialFinalization, CredentialResponse, RegistrationResponse,
  RegistrationUpload,
};
use rand::{rngs::OsRng, CryptoRng, Rng};
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{transport::Channel, Request, Response, Status};
use tracing::{error, instrument};

use ::identity::Cipher;

use crate::identity::{
  get_user_id_request::AuthType,
  identity_service_client::IdentityServiceClient,
  pake_login_response::Data::AccessToken,
  pake_login_response::Data::PakeCredentialResponse,
  registration_request::Data::PakeCredentialFinalization,
  registration_request::Data::PakeRegistrationRequestAndUserId,
  registration_request::Data::PakeRegistrationUploadAndCredentialRequest,
  registration_response::Data::PakeLoginResponse,
  registration_response::Data::PakeRegistrationResponse, GetUserIdRequest,
  GetUserIdResponse, PakeLoginResponse as PakeLoginResponseStruct,
  PakeRegistrationRequestAndUserId as PakeRegistrationRequestAndUserIdStruct,
  PakeRegistrationUploadAndCredentialRequest as PakeRegistrationUploadAndCredentialRequestStruct,
  RegistrationRequest, VerifyUserTokenRequest, VerifyUserTokenResponse,
};
pub mod identity {
  tonic::include_proto!("identity");
}

const IDENTITY_SERVICE_SOCKET_ADDR: &str = "https://[::1]:50051";

lazy_static! {
  pub static ref RUNTIME: Arc<Runtime> = Arc::new(
    Builder::new_multi_thread()
      .worker_threads(1)
      .max_blocking_threads(1)
      .enable_all()
      .build()
      .unwrap()
  );
}

pub struct Client {
  identity_client: IdentityServiceClient<Channel>,
}

impl Client {
  async fn new() -> Self {
    Self {
      identity_client: IdentityServiceClient::connect(
        IDENTITY_SERVICE_SOCKET_ADDR,
      )
      .await
      .unwrap(),
    }
  }

  #[instrument(skip(self))]
  async fn get_user_id(
    &mut self,
    auth_type: AuthType,
    user_info: String,
  ) -> Result<Response<GetUserIdResponse>, Status> {
    self
      .identity_client
      .get_user_id(GetUserIdRequest {
        auth_type: auth_type.into(),
        user_info,
      })
      .await
  }

  #[instrument(skip(self))]
  async fn verify_user_token(
    &mut self,
    user_id: String,
    device_id: String,
    access_token: String,
  ) -> Result<Response<VerifyUserTokenResponse>, Status> {
    self
      .identity_client
      .verify_user_token(VerifyUserTokenRequest {
        user_id,
        device_id,
        access_token,
      })
      .await
  }

  #[instrument(skip(self))]
  async fn register_user(
    &mut self,
    user_id: String,
    device_id: String,
    username: String,
    password: String,
    user_public_key: String,
  ) -> Result<String, Status> {
    let (tx, rx) = mpsc::channel(1);
    let stream = ReceiverStream::new(rx);
    let request = Request::new(stream);
    let mut response = self
      .identity_client
      .register_user(request)
      .await?
      .into_inner();
    let mut client_rng = OsRng;
    let client_registration_start_result =
      ClientRegistration::<Cipher>::start(&mut client_rng, password.as_bytes())
        .map_err(|e| {
          error!("Failed to start PAKE registration: {}", e);
          Status::failed_precondition("PAKE failure")
        })?;
    let pake_registration_request =
      client_registration_start_result.message.serialize();
    let registration_request = RegistrationRequest {
      data: Some(PakeRegistrationRequestAndUserId(
        PakeRegistrationRequestAndUserIdStruct {
          user_id,
          device_id,
          pake_registration_request,
          username,
          user_public_key,
        },
      )),
    };
    if let Err(e) = tx.send(registration_request).await {
      error!("Response was dropped: {}", e);
      return Err(Status::aborted("Dropped response"));
    }
    let mut client_registration: Option<ClientRegistration<Cipher>> =
      Some(client_registration_start_result.state);
    let mut client_login: Option<ClientLogin<Cipher>> = None;
    let mut num_messages_received = 0;
    while let Some(message) = response.message().await? {
      match message.data {
        Some(PakeRegistrationResponse(registration_response_bytes)) => {
          if num_messages_received != 0 {
            error!("Too many messages received in stream, aborting");
            return Err(Status::aborted("please retry"));
          }
          let client_login_start_result = ClientLogin::<Cipher>::start(
            &mut client_rng,
            password.as_bytes(),
            ClientLoginStartParameters::default(),
          )
          .map_err(|e| {
            error!("Failed to start PAKE login: {}", e);
            Status::failed_precondition("PAKE failure")
          })?;
          let registration_request = RegistrationRequest {
            data: Some(PakeRegistrationUploadAndCredentialRequest(
              PakeRegistrationUploadAndCredentialRequestStruct {
                pake_registration_upload: pake_registration_finish(
                  &mut client_rng,
                  &registration_response_bytes,
                  client_registration,
                )?
                .serialize(),
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
          client_registration = None;
          client_login = Some(client_login_start_result.state);
        }
        Some(PakeLoginResponse(PakeLoginResponseStruct {
          data: Some(PakeCredentialResponse(credential_response_bytes)),
        })) => {
          if num_messages_received != 1 {
            error!("Wrong number of messages received in stream, aborting");
            return Err(Status::aborted("please retry"));
          }
          let registration_request = RegistrationRequest {
            data: Some(PakeCredentialFinalization(
              pake_login_finish(&credential_response_bytes, client_login)?
                .serialize()
                .map_err(|e| {
                  error!("Could not serialize credential request: {}", e);
                  Status::failed_precondition("PAKE failure")
                })?,
            )),
          };
          if let Err(e) = tx.send(registration_request).await {
            error!("Response was dropped: {}", e);
            return Err(Status::aborted("Dropped response"));
          }
          client_login = None;
        }
        Some(PakeLoginResponse(PakeLoginResponseStruct {
          data: Some(AccessToken(access_token)),
        })) => {
          if num_messages_received != 2 {
            error!("Wrong number of messages received in stream, aborting");
            return Err(Status::aborted("please retry"));
          }
          return Ok(access_token);
        }
        _ => return Err(Status::invalid_argument("Invalid response data")),
      }
      num_messages_received += 1;
    }
    Err(Status::unknown("Unexpected error"))
  }
}

fn pake_registration_finish(
  rng: &mut (impl Rng + CryptoRng),
  registration_response_bytes: &[u8],
  client_registration: Option<ClientRegistration<Cipher>>,
) -> Result<RegistrationUpload<Cipher>, Status> {
  client_registration
    .ok_or_else(|| {
      error!("PAKE client_registration not found");
      Status::aborted("Registration not found")
    })?
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

fn pake_login_finish(
  credential_response_bytes: &[u8],
  client_login: Option<ClientLogin<Cipher>>,
) -> Result<CredentialFinalization<Cipher>, Status> {
  client_login
    .ok_or_else(|| {
      error!("PAKE client_login not found");
      Status::aborted("Login not found")
    })?
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
