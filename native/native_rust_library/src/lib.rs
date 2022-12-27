use crate::ffi::get42Callback;
use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc::{Receiver, Sender};
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};
use tonic::{transport::Channel, Status};
use tracing::instrument;
use tunnelbroker::tunnelbroker_service_client::TunnelbrokerServiceClient;

mod crypto_tools;
mod identity_client;
mod identity {
  tonic::include_proto!("identity.keyserver");
}
mod tunnelbroker {
  tonic::include_proto!("tunnelbroker");
}

use crypto_tools::generate_device_id;
use identity::identity_keyserver_service_client::IdentityKeyserverServiceClient;

lazy_static! {
  pub static ref RUNTIME: Arc<Runtime> = Arc::new(
    Builder::new_multi_thread()
      .worker_threads(1)
      .max_blocking_threads(1)
      .enable_all()
      .build()
      .unwrap()
  );
  pub static ref CHANNEL: Mutex<(Sender<(f64, u32)>, Receiver<(f64, u32)>)> =
    Mutex::new(tokio::sync::mpsc::channel(100));
}

#[cxx::bridge]
mod ffi {

  enum DeviceType {
    KEYSERVER,
    WEB,
    MOBILE,
  }

  extern "Rust" {
    // Identity Service Client
    type IdentityClient;

    #[cxx_name = "identityInitializeClient"]
    fn initialize_identity_client(addr: String) -> Box<IdentityClient>;

    #[cxx_name = "identityGetUserIdBlocking"]
    fn identity_get_user_id_blocking(
      client: Box<IdentityClient>,
      auth_type: i32,
      user_info: String,
    ) -> Result<String>;

    #[cxx_name = "identityVerifyUserTokenBlocking"]
    fn identity_verify_user_token_blocking(
      client: Box<IdentityClient>,
      user_id: String,
      signing_public_key: String,
      access_token: String,
    ) -> Result<bool>;

    #[cxx_name = "identityRegisterUserBlocking"]
    fn identity_register_user_blocking(
      client: Box<IdentityClient>,
      user_id: String,
      signing_public_key: String,
      username: String,
      password: String,
    ) -> Result<String>;

    #[cxx_name = "identityLoginUserPakeBlocking"]
    fn identity_login_user_pake_blocking(
      client: Box<IdentityClient>,
      user_id: String,
      signing_public_key: String,
      password: String,
    ) -> Result<String>;

    #[cxx_name = "identityLoginUserWalletBlocking"]
    fn identity_login_user_wallet_blocking(
      client: Box<IdentityClient>,
      user_id: String,
      signing_public_key: String,
      siwe_message: String,
      siwe_signature: String,
    ) -> Result<String>;

    // Tunnelbroker Service Client
    type TunnelbrokerClient;

    #[cxx_name = "TunnelbrokerInitializeClient"]
    fn initialize_tunnelbroker_client(addr: String) -> Box<TunnelbrokerClient>;

    // Crypto Tools
    fn generate_device_id(device_type: DeviceType) -> Result<String>;
    // Test
    fn get_42(counter: u32);
  }

  unsafe extern "C++" {
    include!("RustCallback.h");
    #[namespace = "comm"]
    fn get42Callback(error: String, counter: u32, ret: f64);
  }
}

fn get_42(counter: u32) {
  println!("I SEE YOU!!!");
  get_42_helper(counter);
}

fn get_42_helper(counter: u32) {
  RUNTIME.spawn(async move {
    sleep(Duration::from_secs(10)).await;
    println!("awake now!");
    get42Callback("".to_string(), counter, 42.0);
  });
}

#[derive(Debug)]
pub struct IdentityClient {
  identity_client: IdentityKeyserverServiceClient<Channel>,
}

fn initialize_identity_client(addr: String) -> Box<IdentityClient> {
  Box::new(IdentityClient {
    identity_client: RUNTIME
      .block_on(IdentityKeyserverServiceClient::connect(addr))
      .unwrap(),
  })
}

#[instrument]
fn identity_get_user_id_blocking(
  client: Box<IdentityClient>,
  auth_type: i32,
  user_info: String,
) -> Result<String, Status> {
  RUNTIME.block_on(identity_client::get_user_id(client, auth_type, user_info))
}

#[instrument]
fn identity_verify_user_token_blocking(
  client: Box<IdentityClient>,
  user_id: String,
  signing_public_key: String,
  access_token: String,
) -> Result<bool, Status> {
  RUNTIME.block_on(identity_client::verify_user_token(
    client,
    user_id,
    signing_public_key,
    access_token,
  ))
}

#[instrument]
fn identity_register_user_blocking(
  client: Box<IdentityClient>,
  user_id: String,
  signing_public_key: String,
  username: String,
  password: String,
) -> Result<String, Status> {
  RUNTIME.block_on(identity_client::register_user(
    client,
    user_id,
    signing_public_key,
    username,
    password,
  ))
}

#[instrument]
fn identity_login_user_pake_blocking(
  client: Box<IdentityClient>,
  user_id: String,
  signing_public_key: String,
  password: String,
) -> Result<String, Status> {
  RUNTIME.block_on(identity_client::login_user_pake(
    client,
    user_id,
    signing_public_key,
    password,
  ))
}

#[instrument]
fn identity_login_user_wallet_blocking(
  client: Box<IdentityClient>,
  user_id: String,
  signing_public_key: String,
  siwe_message: String,
  siwe_signature: String,
) -> Result<String, Status> {
  RUNTIME.block_on(identity_client::login_user_wallet(
    client,
    user_id,
    signing_public_key,
    siwe_message,
    siwe_signature,
  ))
}

#[derive(Debug)]
pub struct TunnelbrokerClient {
  tunnelbroker_client: TunnelbrokerServiceClient<Channel>,
}

fn initialize_tunnelbroker_client(addr: String) -> Box<TunnelbrokerClient> {
  Box::new(TunnelbrokerClient {
    tunnelbroker_client: RUNTIME
      .block_on(TunnelbrokerServiceClient::connect(addr))
      .expect("Failed to create Tokio runtime for the Tunnelbroker client"),
  })
}
