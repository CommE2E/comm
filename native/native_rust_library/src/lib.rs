use lazy_static::lazy_static;
use tokio::runtime::{Builder, Runtime};
use tonic::{transport::Channel, Status};
use tracing::instrument;

mod blob_client;
mod identity_client;
mod opaque;
mod identity {
  tonic::include_proto!("identity");
}

use blob_client::{
  complete_upload, initialize_download_state, initialize_upload_state,
  pull_chunk, start_upload, upload_chunk, DownloadState, UploadState,
};
use identity::identity_service_client::IdentityServiceClient;
use identity_client::{
  get_user_id, login_user_pake, login_user_wallet, register_user,
  verify_user_token,
};

const IDENTITY_SERVICE_SOCKET_ADDR: &str = "https://[::1]:50051";

lazy_static! {
  pub static ref RUNTIME: Runtime = Builder::new_multi_thread()
    .worker_threads(1)
    .max_blocking_threads(1)
    .enable_all()
    .build()
    .unwrap();
}

#[cxx::bridge]
mod ffi {
  // data structures which fields need to be accessible in both
  // Rust and C++ must be declared outside extern "C++/Rust"

  // Blob Service Client
  struct BlobChunkResponse {
    stream_end: bool,
    data: Vec<u8>,
  }

  // data structures declared here will be accessible in C++
  // but their fields will not be visible
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

    // Blob Service Client
    type UploadState;
    type DownloadState;

    fn initialize_upload_state_blocking() -> Result<Box<UploadState>>;
    fn start_upload_blocking(
      state: &mut Box<UploadState>,
      holder: String,
      hash: String,
    ) -> Result<()>;
    fn upload_chunk_blocking(
      state: &mut Box<UploadState>,
      chunk: &[u8],
    ) -> Result<()>;
    fn complete_upload_blocking(client: Box<UploadState>) -> Result<bool>;
    fn initialize_download_state_blocking(
      holder: String,
    ) -> Result<Box<DownloadState>>;
    fn pull_chunk_blocking(
      client: &mut Box<DownloadState>,
    ) -> Result<BlobChunkResponse>;
  }
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

pub fn initialize_upload_state_blocking() -> Result<Box<UploadState>, String> {
  RUNTIME.block_on(initialize_upload_state())
}

pub fn start_upload_blocking(
  state: &mut Box<UploadState>,
  holder: String,
  hash: String,
) -> Result<(), String> {
  RUNTIME.block_on(start_upload(state, holder, hash))
}

pub fn upload_chunk_blocking(
  state: &mut Box<UploadState>,
  chunk: &[u8],
) -> Result<(), String> {
  RUNTIME.block_on(upload_chunk(state, chunk))
}

pub fn complete_upload_blocking(
  client: Box<UploadState>,
) -> Result<bool, String> {
  RUNTIME.block_on(complete_upload(client))
}

pub fn initialize_download_state_blocking(
  holder: String,
) -> Result<Box<DownloadState>, String> {
  RUNTIME.block_on(initialize_download_state(holder))
}

pub fn pull_chunk_blocking(
  client: &mut Box<DownloadState>,
) -> Result<ffi::BlobChunkResponse, String> {
  RUNTIME.block_on(pull_chunk(client))
}
