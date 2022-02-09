use argon2::Argon2;
use digest::generic_array::GenericArray;
use digest::Digest;
use opaque_ke::ciphersuite::CipherSuite;
use opaque_ke::errors::{InternalPakeError, ProtocolError};
use opaque_ke::hash::Hash;
use opaque_ke::slow_hash::SlowHash;
use opaque_ke::{
  ClientLogin, ClientLoginFinishParameters, ClientLoginFinishResult, ClientLoginStartParameters,
  ClientLoginStartResult, ClientRegistration, ClientRegistrationFinishParameters,
  ClientRegistrationFinishResult, ClientRegistrationStartResult, CredentialResponse,
  RegistrationResponse,
};
use rand::rngs::OsRng;
use std::ops::Deref;

struct Cipher;

impl CipherSuite for Cipher {
  type Group = curve25519_dalek::ristretto::RistrettoPoint;
  type KeyExchange = opaque_ke::key_exchange::tripledh::TripleDH;
  type Hash = sha2::Sha512;
  type SlowHash = ArgonWrapper;
}

struct ArgonWrapper(Argon2<'static>);

impl<D: Hash> SlowHash<D> for ArgonWrapper {
  fn hash(
    input: GenericArray<u8, <D as Digest>::OutputSize>,
  ) -> Result<Vec<u8>, InternalPakeError> {
    let params = Argon2::default();
    let mut output = vec![0u8; <D as Digest>::output_size()];
    params
      .hash_password_into(&input, &[0; argon2::MIN_SALT_LEN], &mut output)
      .map_err(|_| InternalPakeError::SlowHashError)?;
    Ok(output)
  }
}

#[cxx::bridge]
mod ffi {
  #[derive(Debug)]
  struct MessageState {
    message: Vec<u8>,
    state: Vec<u8>,
  }

  #[derive(Debug)]
  struct MessageSession {
    message: Vec<u8>,
    session: Vec<u8>,
  }

  struct ServerKeyPair {
    public: Vec<u8>,
    private: Vec<u8>,
  }

  extern "Rust" {
    fn client_register_cxx(password: String) -> Result<MessageState>;
    fn client_register_finish_cxx(
      client_register_state: Vec<u8>,
      server_message: Vec<u8>,
    ) -> Result<Vec<u8>>;
    fn client_login_cxx(password: String) -> Result<MessageState>;
    fn client_login_finish_cxx(
      client_login_state: Vec<u8>,
      server_message: Vec<u8>,
    ) -> Result<MessageSession>;
    fn server_kp() -> ServerKeyPair;
  }
}

fn client_register_cxx(password: String) -> Result<ffi::MessageState, ProtocolError> {
  let c = client_register(&password)?;

  let message_bytes = c.message.serialize();
  let state_bytes = c.state.serialize();

  Ok(ffi::MessageState {
    message: message_bytes,
    state: state_bytes,
  })
}

fn client_register_finish_cxx(
  client_register_state: Vec<u8>,
  server_message: Vec<u8>,
) -> Result<Vec<u8>, ProtocolError> {
  let client_register_state = ClientRegistration::<Cipher>::deserialize(&client_register_state)?;
  let server_message = RegistrationResponse::<Cipher>::deserialize(&server_message)?;

  let c = client_register_finish(client_register_state, server_message)?;

  let message_bytes = c.message.serialize();

  Ok(message_bytes)
}

fn client_login_cxx(password: String) -> Result<ffi::MessageState, ProtocolError> {
  let c = client_login(&password)?;

  let message_bytes = c.message.serialize()?;
  let state_bytes = c.state.serialize()?;

  Ok(ffi::MessageState {
    message: message_bytes,
    state: state_bytes,
  })
}

fn client_login_finish_cxx(
  client_login_state: Vec<u8>,
  server_message: Vec<u8>,
) -> Result<ffi::MessageSession, ProtocolError> {
  let client_login_state = ClientLogin::<Cipher>::deserialize(&client_login_state)?;
  let server_message = CredentialResponse::<Cipher>::deserialize(&server_message)?;

  // An InvalidLogin will be emitted in this step in the case of an incorrect password
  let c = client_login_finish(client_login_state, server_message)?;

  let message_bytes = c.message.serialize()?;
  let session_bytes = c.session_key;

  Ok(ffi::MessageSession {
    message: message_bytes,
    session: session_bytes,
  })
}

fn client_register(password: &str) -> Result<ClientRegistrationStartResult<Cipher>, ProtocolError> {
  let mut client_rng = OsRng;
  ClientRegistration::<Cipher>::start(&mut client_rng, password.as_bytes())
}

fn client_register_finish(
  client_register_state: ClientRegistration<Cipher>,
  server_message: RegistrationResponse<Cipher>,
) -> Result<ClientRegistrationFinishResult<Cipher>, ProtocolError> {
  let mut client_rng = OsRng;
  client_register_state.finish(
    &mut client_rng,
    server_message,
    ClientRegistrationFinishParameters::Default,
  )
}

fn client_login(password: &str) -> Result<ClientLoginStartResult<Cipher>, ProtocolError> {
  let mut client_rng = OsRng;
  ClientLogin::<Cipher>::start(
    &mut client_rng,
    password.as_bytes(),
    ClientLoginStartParameters::default(),
  )
}

fn client_login_finish(
  client_login_state: ClientLogin<Cipher>,
  server_message: CredentialResponse<Cipher>,
) -> Result<ClientLoginFinishResult<Cipher>, ProtocolError> {
  client_login_state.finish(server_message, ClientLoginFinishParameters::default())
}

fn server_kp() -> ffi::ServerKeyPair {
  let mut rng = OsRng;
  let keypair = Cipher::generate_random_keypair(&mut rng);
  let public_key = keypair.public().deref().to_vec();
  let private_key = keypair.private().deref().to_vec();
  ffi::ServerKeyPair {
    public: public_key,
    private: private_key,
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use opaque_ke::{ServerLogin, ServerLoginStartParameters, ServerRegistration};

  macro_rules! assert_err {
      ($expression:expr, $($pattern:tt)+) => {
          match $expression {
              $($pattern)+ => (),
              ref e => panic!("expected `{}` but got `{:?}`", stringify!($($pattern)+), e),
          }
      }
  }

  #[test]
  fn test_client_register_cxx_ok() {
    let password = String::from("hunter2");
    assert!(client_register_cxx(password).is_ok());
  }

  #[test]
  fn test_client_register_cxx_ok_empty_string() {
    let password = String::from("");
    assert!(client_register_cxx(password).is_ok());
  }

  #[test]
  fn test_client_register_finish_cxx_ok() {
    let password = "hunter2";
    let mut client_rng = OsRng;
    let client_registration_start_result =
      ClientRegistration::<Cipher>::start(&mut client_rng, password.as_bytes()).unwrap();
    let mut rng = OsRng;
    let server_kp = Cipher::generate_random_keypair(&mut rng);
    let mut server_rng = OsRng;
    let server_registration_start_result = ServerRegistration::<Cipher>::start(
      &mut server_rng,
      client_registration_start_result.message,
      &server_kp.public(),
    )
    .unwrap();
    let client_register_state = client_registration_start_result.state.serialize();
    let server_message = server_registration_start_result.message.serialize();
    assert!(client_register_finish_cxx(client_register_state, server_message).is_ok());
  }

  #[test]
  fn test_client_register_finish_cxx_err_state_deserialization_failed() {
    let password = "hunter2";
    let mut client_rng = OsRng;
    let client_registration_start_result =
      ClientRegistration::<Cipher>::start(&mut client_rng, password.as_bytes()).unwrap();
    let mut rng = OsRng;
    let server_kp = Cipher::generate_random_keypair(&mut rng);
    let mut server_rng = OsRng;
    let server_registration_start_result = ServerRegistration::<Cipher>::start(
      &mut server_rng,
      client_registration_start_result.message,
      &server_kp.public(),
    )
    .unwrap();
    let client_register_state = vec![];
    let server_message = server_registration_start_result.message.serialize();
    let client_finish_registration_result =
      client_register_finish_cxx(client_register_state, server_message);
    assert!(client_finish_registration_result.is_err());
    assert_err!(
      client_finish_registration_result,
      Err(ProtocolError::VerificationError(_))
    );
  }

  #[test]
  fn test_client_register_finish_cxx_err_message_deserialization_failed() {
    let password = "hunter2";
    let mut client_rng = OsRng;
    let client_registration_start_result =
      ClientRegistration::<Cipher>::start(&mut client_rng, password.as_bytes()).unwrap();
    let client_register_state = client_registration_start_result.state.serialize();
    let server_message = vec![];
    let client_finish_registration_result =
      client_register_finish_cxx(client_register_state, server_message);
    assert!(client_finish_registration_result.is_err());
    assert_err!(
      client_finish_registration_result,
      Err(ProtocolError::VerificationError(_))
    );
  }

  #[test]
  fn test_client_login_cxx_ok() {
    let password = String::from("hunter2");
    assert!(client_login_cxx(password).is_ok());
  }

  #[test]
  fn test_client_login_cxx_ok_empty_string() {
    let password = String::from("");
    assert!(client_login_cxx(password).is_ok());
  }

  #[test]
  fn test_client_login_finish_cxx_ok() {
    let mut client_rng = OsRng;
    let mut server_rng = OsRng;
    let client_registration_start_result =
      ClientRegistration::<Cipher>::start(&mut client_rng, b"hunter2").unwrap();
    let server_kp = Cipher::generate_random_keypair(&mut server_rng);
    let server_registration_start_result = ServerRegistration::<Cipher>::start(
      &mut server_rng,
      client_registration_start_result.message,
      server_kp.public(),
    )
    .unwrap();
    let client_registration_finish_result = client_registration_start_result
      .state
      .finish(
        &mut client_rng,
        server_registration_start_result.message,
        ClientRegistrationFinishParameters::default(),
      )
      .unwrap();
    let p_file = server_registration_start_result
      .state
      .finish(client_registration_finish_result.message)
      .unwrap();
    let client_login_start_result = ClientLogin::<Cipher>::start(
      &mut client_rng,
      b"hunter2",
      ClientLoginStartParameters::default(),
    )
    .unwrap();
    let server_login_start_result = ServerLogin::start(
      &mut server_rng,
      p_file,
      &server_kp.private(),
      client_login_start_result.message,
      ServerLoginStartParameters::default(),
    )
    .unwrap();
    assert!(client_login_finish_cxx(
      client_login_start_result.state.serialize().unwrap(),
      server_login_start_result.message.serialize().unwrap()
    )
    .is_ok());
  }

  #[test]
  fn test_client_login_finish_cxx_err_state_deserialization_failed() {
    let mut client_rng = OsRng;
    let mut server_rng = OsRng;
    let client_registration_start_result =
      ClientRegistration::<Cipher>::start(&mut client_rng, b"hunter2").unwrap();
    let server_kp = Cipher::generate_random_keypair(&mut server_rng);
    let server_registration_start_result = ServerRegistration::<Cipher>::start(
      &mut server_rng,
      client_registration_start_result.message,
      server_kp.public(),
    )
    .unwrap();
    let client_registration_finish_result = client_registration_start_result
      .state
      .finish(
        &mut client_rng,
        server_registration_start_result.message,
        ClientRegistrationFinishParameters::default(),
      )
      .unwrap();
    let p_file = server_registration_start_result
      .state
      .finish(client_registration_finish_result.message)
      .unwrap();
    let client_login_start_result = ClientLogin::<Cipher>::start(
      &mut client_rng,
      b"hunter2",
      ClientLoginStartParameters::default(),
    )
    .unwrap();
    let server_login_start_result = ServerLogin::start(
      &mut server_rng,
      p_file,
      &server_kp.private(),
      client_login_start_result.message,
      ServerLoginStartParameters::default(),
    )
    .unwrap();
    assert_err!(
      client_login_finish_cxx(
        vec![],
        server_login_start_result.message.serialize().unwrap()
      ),
      Err(ProtocolError::VerificationError(_))
    );
  }

  #[test]
  fn test_client_login_finish_cxx_err_message_deserialization_failed() {
    let mut client_rng = OsRng;
    let client_login_start_result = ClientLogin::<Cipher>::start(
      &mut client_rng,
      b"hunter2",
      ClientLoginStartParameters::default(),
    )
    .unwrap();
    assert_err!(
      client_login_finish_cxx(client_login_start_result.state.serialize().unwrap(), vec![]),
      Err(ProtocolError::VerificationError(_))
    );
  }

  #[test]
  fn test_server_kp_ok() {
    let keys = server_kp();
    assert_eq!(keys.public.len(), 32);
    assert_eq!(keys.private.len(), 32);
  }
}
