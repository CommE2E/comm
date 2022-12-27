use crate::ffi::get42Callback;
use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tokio::sync::mpsc::{Receiver, Sender};
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};
use tonic::{transport::Channel, Status};
use tracing::instrument;

mod crypto_tools;
mod identity_client;
mod identity {
  tonic::include_proto!("identity");
}

use crypto_tools::generate_device_id;
use identity::identity_service_client::IdentityServiceClient;
use identity_client::{
  get_user_id, login_user_pake, login_user_wallet, register_user,
  verify_user_token,
};

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
    type Client;
    fn initialize_client() -> Box<Client>;
    fn get_user_id_blocking(
      client: Box<Client>,
      auth_type: i32,
      user_info: String,
    ) -> Result<String>;
    fn verify_user_token_blocking(
      client: Box<Client>,
      user_id: String,
      device_id: String,
      access_token: String,
    ) -> Result<bool>;
    fn register_user_blocking(
      client: Box<Client>,
      user_id: String,
      device_id: String,
      username: String,
      password: String,
      user_public_key: String,
    ) -> Result<String>;
    fn login_user_pake_blocking(
      client: Box<Client>,
      user_id: String,
      device_id: String,
      password: String,
      user_public_key: String,
    ) -> Result<String>;
    fn login_user_wallet_blocking(
      client: Box<Client>,
      user_id: String,
      device_id: String,
      siwe_message: String,
      siwe_signature: Vec<u8>,
      user_public_key: String,
    ) -> Result<String>;
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
pub struct Client {
  identity_client: IdentityServiceClient<Channel>,
}

fn initialize_client() -> Box<Client> {
  Box::new(Client {
    identity_client: RUNTIME
      .block_on(IdentityServiceClient::connect(IDENTITY_SERVICE_SOCKET_ADDR))
      .unwrap(),
  })
}

#[instrument]
fn get_user_id_blocking(
  client: Box<Client>,
  auth_type: i32,
  user_info: String,
) -> Result<String, Status> {
  RUNTIME.block_on(get_user_id(client, auth_type, user_info))
}

#[instrument]
fn verify_user_token_blocking(
  client: Box<Client>,
  user_id: String,
  device_id: String,
  access_token: String,
) -> Result<bool, Status> {
  RUNTIME.block_on(verify_user_token(client, user_id, device_id, access_token))
}

#[instrument]
fn register_user_blocking(
  client: Box<Client>,
  user_id: String,
  device_id: String,
  username: String,
  password: String,
  user_public_key: String,
) -> Result<String, Status> {
  RUNTIME.block_on(register_user(
    client,
    user_id,
    device_id,
    username,
    password,
    user_public_key,
  ))
}

#[instrument]
fn login_user_pake_blocking(
  client: Box<Client>,
  user_id: String,
  device_id: String,
  password: String,
  user_public_key: String,
) -> Result<String, Status> {
  RUNTIME.block_on(login_user_pake(
    client,
    user_id,
    device_id,
    password,
    user_public_key,
  ))
}

#[instrument]
fn login_user_wallet_blocking(
  client: Box<Client>,
  user_id: String,
  device_id: String,
  siwe_message: String,
  siwe_signature: Vec<u8>,
  user_public_key: String,
) -> Result<String, Status> {
  RUNTIME.block_on(login_user_wallet(
    client,
    user_id,
    device_id,
    siwe_message,
    siwe_signature,
    user_public_key,
  ))
}
