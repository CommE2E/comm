use constant_time_eq::constant_time_eq;
use futures_core::Stream;
use rand::{CryptoRng, Rng};
use rusoto_core::RusotoError;
use rusoto_dynamodb::{GetItemError, PutItemError};
use std::pin::Pin;
use tonic::{Request, Response, Status};
use tracing::{error, info, instrument};

use crate::database::DatabaseClient;
use crate::token::{AccessTokenData, AuthType};
use crate::{config::Config, database::Error};

pub use proto::identity_service_server::IdentityServiceServer;
use proto::{
  identity_service_server::IdentityService,
  login_response::Data::PakeLoginResponse,
  login_response::Data::WalletLoginResponse,
  pake_login_response::Data::AccessToken, LoginRequest, LoginResponse,
  PakeLoginResponse as PakeLoginResponseStruct, RegistrationRequest,
  RegistrationResponse, VerifyUserTokenRequest, VerifyUserTokenResponse,
  WalletLoginResponse as WalletLoginResponseStruct,
};

mod proto {
  tonic::include_proto!("identity");
}

enum PakeWorkflow {
  Registration,
  Login,
}

#[derive(derive_more::Constructor)]
pub struct MyIdentityService {
  config: Config,
  client: DatabaseClient,
}

#[tonic::async_trait]
impl IdentityService for MyIdentityService {
  type RegisterUserStream = Pin<
    Box<
      dyn Stream<Item = Result<RegistrationResponse, Status>> + Send + 'static,
    >,
  >;

  async fn register_user(
    &self,
    request: Request<tonic::Streaming<RegistrationRequest>>,
  ) -> Result<Response<Self::RegisterUserStream>, Status> {
    println!("Got a registration request: {:?}", request);
    unimplemented!()
  }

  type LoginUserStream =
    Pin<Box<dyn Stream<Item = Result<LoginResponse, Status>> + Send + 'static>>;

  async fn login_user(
    &self,
    request: Request<tonic::Streaming<LoginRequest>>,
  ) -> Result<Response<Self::LoginUserStream>, Status> {
    println!("Got a login request: {:?}", request);
    unimplemented!()
  }

  #[instrument(skip(self))]
  async fn verify_user_token(
    &self,
    request: Request<VerifyUserTokenRequest>,
  ) -> Result<Response<VerifyUserTokenResponse>, Status> {
    info!("Received VerifyUserToken request: {:?}", request);
    let message = request.into_inner();
    let token_valid = match self
      .client
      .get_access_token_data(message.user_id, message.device_id)
      .await
    {
      Ok(Some(access_token_data)) => constant_time_eq(
        access_token_data.access_token.as_bytes(),
        message.access_token.as_bytes(),
      ),
      Ok(None) => false,
      Err(Error::RusotoGet(RusotoError::Service(
        GetItemError::ResourceNotFound(_),
      )))
      | Err(Error::RusotoGet(RusotoError::Credentials(_))) => {
        return Err(Status::failed_precondition("internal error"))
      }
      Err(Error::RusotoGet(_)) => {
        return Err(Status::unavailable("please retry"))
      }
      Err(e) => {
        error!("Encountered an unexpected error: {}", e);
        return Err(Status::failed_precondition("unexpected error"));
      }
    };
    let response = Response::new(VerifyUserTokenResponse { token_valid });
    info!("Sending VerifyUserToken response: {:?}", response);
    Ok(response)
  }
}

async fn put_token_helper(
  client: DatabaseClient,
  auth_type: AuthType,
  user_id: String,
  device_id: String,
  rng: &mut (impl Rng + CryptoRng),
) -> Result<LoginResponse, Status> {
  let access_token_data =
    AccessTokenData::new(user_id, device_id, auth_type.clone(), rng);
  match client
    .put_access_token_data(access_token_data.clone())
    .await
  {
    Ok(_) => match auth_type {
      AuthType::Wallet => Ok(LoginResponse {
        data: Some(WalletLoginResponse(WalletLoginResponseStruct {
          access_token: access_token_data.access_token,
        })),
      }),
      AuthType::Password => Ok(LoginResponse {
        data: Some(PakeLoginResponse(PakeLoginResponseStruct {
          data: Some(AccessToken(access_token_data.access_token)),
        })),
      }),
    },
    Err(Error::RusotoPut(RusotoError::Service(
      PutItemError::ResourceNotFound(_),
    )))
    | Err(Error::RusotoPut(RusotoError::Credentials(_))) => {
      Err(Status::failed_precondition("internal error"))
    }
    Err(Error::RusotoPut(_)) => Err(Status::unavailable("please retry")),
    Err(e) => {
      error!("Encountered an unexpected error: {}", e);
      Err(Status::failed_precondition("unexpected error"))
    }
  }
}
