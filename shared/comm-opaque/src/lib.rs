mod client;
mod config;
mod constants;
mod grpc;
mod opaque;
mod server;

pub use crate::opaque::Cipher;

#[test]
pub fn test_register_and_login() {
  let pass = "test";

  // Register user
  let (client_reg_res, client_message) =
    client::register_start(pass.as_bytes()).unwrap();

  let (server_reg_res, server_response) =
    server::register_start(&client_message).unwrap();

  let client_upload =
    client::register_finish(client_reg_res, &server_response).unwrap();

  let password_file =
    server::register_finish(server_reg_res, &client_upload).unwrap();
  // These bytes are the used to validate future login sessions, normally it
  // would saved to a database or other data store
  let password_registration_bytes = password_file.serialize();

  // Login user
  let (client_login_res, client_request) =
    client::login_start(pass.as_bytes()).unwrap();

  let registration =
    server::deserialize_registration(&password_registration_bytes).unwrap();
  let (server_login_res, server_response) =
    server::login_start(registration, &client_request).unwrap();

  let client_finish_res =
    client::login_finish(client_login_res, &server_response).unwrap();
  let client_upload = client_finish_res.message.serialize().unwrap();

  server::login_finish(server_login_res, &client_upload).unwrap();
}
