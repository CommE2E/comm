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
  let mut client_register = client::Registration::new();
  let client_message = client_register.start(pass).unwrap();

  let mut server_register = server::Registration::new();
  let server_response = server_register.start(&client_message).unwrap();

  let client_upload = client_register.finish(&server_response).unwrap();

  // These bytes are the used to validate future login sessions, normally it
  // would saved to a database or other data store
  let password_file_bytes = server_register.finish(&client_upload).unwrap();

  // Login user
  let mut login_client = client::Login::new();
  let client_request = login_client.start(pass).unwrap();

  let mut server_login = server::Login::new();
  let server_response = server_login
    .start(&password_file_bytes, &client_request)
    .unwrap();

  let client_upload = login_client.finish(&server_response).unwrap();

  server_login.finish(&client_upload).unwrap();

  assert_eq!(login_client.session_key, server_login.session_key);
}
