use argon2::Argon2;
use digest::generic_array::GenericArray;
use digest::Digest;
use opaque_ke::ciphersuite::CipherSuite;
use opaque_ke::errors::{InternalPakeError, ProtocolError};
use opaque_ke::hash::Hash;
use opaque_ke::keypair::Key;
use opaque_ke::slow_hash::SlowHash;
use opaque_ke::{
  ClientLogin, ClientLoginFinishParameters, ClientLoginStartParameters, ClientRegistration,
  ClientRegistrationFinishParameters, CredentialFinalization, CredentialRequest,
  CredentialResponse, RegistrationRequest, RegistrationResponse, RegistrationUpload, ServerLogin,
  ServerLoginStartParameters, ServerRegistration,
};
use rand::rngs::OsRng;

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
  struct ClientRegistrationStartResult {
    message: Vec<u8>,
    state: Vec<u8>,
  }

  #[derive(Debug)]
  struct ClientRegistrationFinishResult {
    message: Vec<u8>,
  }

  struct ClientLoginStartResult {
    message: Vec<u8>,
    state: Vec<u8>,
  }

  #[derive(Debug)]
  struct ClientLoginFinishResult {
    message: Vec<u8>,
    session_key: Vec<u8>,
  }

  struct ServerKeyPair {
    public: Vec<u8>,
    private: Vec<u8>,
  }

  struct ServerRegistrationStartResult {
    message: Vec<u8>,
    state: Vec<u8>,
  }

  struct ServerRegistrationFinishResult {
    password_file: Vec<u8>,
  }

  struct ServerLoginStartResult {
    message: Vec<u8>,
    state: Vec<u8>,
  }

  struct ServerLoginFinishResult {
    session_key: Vec<u8>,
  }

  extern "Rust" {
    fn client_register_cxx(password: String) -> Result<ClientRegistrationStartResult>;
    fn client_register_finish_cxx(
      client_register_state: Vec<u8>,
      server_message: Vec<u8>,
    ) -> Result<ClientRegistrationFinishResult>;
    fn client_login_cxx(password: String) -> Result<ClientLoginStartResult>;
    fn client_login_finish_cxx(
      client_login_state: Vec<u8>,
      server_message: Vec<u8>,
    ) -> Result<ClientLoginFinishResult>;
    fn server_kp() -> ServerKeyPair;
    fn server_register_cxx(
      registration_request: Vec<u8>,
      server_public_key: Vec<u8>,
    ) -> Result<ServerRegistrationStartResult>;
    fn server_register_finish_cxx(
      server_register_state: Vec<u8>,
      client_message: Vec<u8>,
    ) -> Result<ServerRegistrationFinishResult>;
    fn server_login_cxx(
      password_file: Vec<u8>,
      server_private_key: Vec<u8>,
      login_request: Vec<u8>,
    ) -> Result<ServerLoginStartResult>;
    fn server_login_finish_cxx(
      server_login_state: Vec<u8>,
      client_message: Vec<u8>,
    ) -> Result<ServerLoginFinishResult>;
  }
}

fn client_register_cxx(
  password: String,
) -> Result<ffi::ClientRegistrationStartResult, ProtocolError> {
  let mut client_rng = OsRng;
  let c = ClientRegistration::<Cipher>::start(&mut client_rng, password.as_bytes())?;

  Ok(ffi::ClientRegistrationStartResult {
    message: c.message.serialize(),
    state: c.state.serialize(),
  })
}

fn client_register_finish_cxx(
  client_register_state: Vec<u8>,
  server_message: Vec<u8>,
) -> Result<ffi::ClientRegistrationFinishResult, ProtocolError> {
  let client_register_state = ClientRegistration::<Cipher>::deserialize(&client_register_state)?;
  let server_message = RegistrationResponse::<Cipher>::deserialize(&server_message)?;

  let mut client_rng = OsRng;
  let c = client_register_state.finish(
    &mut client_rng,
    server_message,
    ClientRegistrationFinishParameters::default(),
  )?;

  Ok(ffi::ClientRegistrationFinishResult {
    message: c.message.serialize(),
  })
}

fn client_login_cxx(password: String) -> Result<ffi::ClientLoginStartResult, ProtocolError> {
  let mut client_rng = OsRng;
  let c = ClientLogin::<Cipher>::start(
    &mut client_rng,
    password.as_bytes(),
    ClientLoginStartParameters::default(),
  )?;

  Ok(ffi::ClientLoginStartResult {
    message: c.message.serialize()?,
    state: c.state.serialize()?,
  })
}

fn client_login_finish_cxx(
  client_login_state: Vec<u8>,
  server_message: Vec<u8>,
) -> Result<ffi::ClientLoginFinishResult, ProtocolError> {
  let client_login_state = ClientLogin::<Cipher>::deserialize(&client_login_state)?;
  let server_message = CredentialResponse::<Cipher>::deserialize(&server_message)?;

  // An InvalidLogin will be emitted in this step in the case of an incorrect password
  let c = client_login_state.finish(server_message, ClientLoginFinishParameters::default())?;

  Ok(ffi::ClientLoginFinishResult {
    message: c.message.serialize()?,
    session_key: c.session_key,
  })
}

fn server_kp() -> ffi::ServerKeyPair {
  let mut rng = OsRng;
  let keypair = Cipher::generate_random_keypair(&mut rng);
  let public_key = keypair.public().to_vec();
  let private_key = keypair.private().to_vec();
  ffi::ServerKeyPair {
    public: public_key,
    private: private_key,
  }
}

fn server_register_cxx(
  registration_request: Vec<u8>,
  server_public_key: Vec<u8>,
) -> Result<ffi::ServerRegistrationStartResult, ProtocolError> {
  let registration_request = RegistrationRequest::<Cipher>::deserialize(&registration_request)?;
  let server_public_key = Key::from_bytes(&server_public_key)?;

  let mut server_rng = OsRng;
  let s =
    ServerRegistration::<Cipher>::start(&mut server_rng, registration_request, &server_public_key)?;

  Ok(ffi::ServerRegistrationStartResult {
    message: s.message.serialize(),
    state: s.state.serialize(),
  })
}

fn server_register_finish_cxx(
  server_register_state: Vec<u8>,
  client_message: Vec<u8>,
) -> Result<ffi::ServerRegistrationFinishResult, ProtocolError> {
  let server_register_state = ServerRegistration::<Cipher>::deserialize(&server_register_state)?;
  let client_message = RegistrationUpload::<Cipher>::deserialize(&client_message)?;

  let s = server_register_state.finish(client_message)?;

  Ok(ffi::ServerRegistrationFinishResult {
    password_file: s.serialize(),
  })
}

fn server_login_cxx(
  password_file: Vec<u8>,
  server_private_key: Vec<u8>,
  login_request: Vec<u8>,
) -> Result<ffi::ServerLoginStartResult, ProtocolError> {
  let password_file = ServerRegistration::<Cipher>::deserialize(&password_file)?;
  let server_private_key = Key::from_bytes(&server_private_key)?;
  let login_request = CredentialRequest::<Cipher>::deserialize(&login_request)?;

  let mut server_rng = OsRng;
  let s = ServerLogin::start(
    &mut server_rng,
    password_file,
    &server_private_key,
    login_request,
    ServerLoginStartParameters::default(),
  )?;

  Ok(ffi::ServerLoginStartResult {
    message: s.message.serialize()?,
    state: s.state.serialize()?,
  })
}

fn server_login_finish_cxx(
  server_login_state: Vec<u8>,
  client_message: Vec<u8>,
) -> Result<ffi::ServerLoginFinishResult, ProtocolError> {
  let server_login_state = ServerLogin::<Cipher>::deserialize(&server_login_state)?;
  let client_message = CredentialFinalization::<Cipher>::deserialize(&client_message)?;

  let s = server_login_state.finish(client_message)?;

  Ok(ffi::ServerLoginFinishResult {
    session_key: s.session_key,
  })
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

  #[test]
  fn test_server_register_cxx_ok() {
    let password = "hunter2";
    let mut client_rng = OsRng;
    let client_registration_start_result =
      ClientRegistration::<Cipher>::start(&mut client_rng, password.as_bytes()).unwrap();
    let mut rng = OsRng;
    let server_kp = Cipher::generate_random_keypair(&mut rng);
    assert!(server_register_cxx(
      client_registration_start_result.message.serialize(),
      server_kp.public().to_vec()
    )
    .is_ok())
  }

  #[test]
  fn test_server_register_cxx_err_request_deserialization_failed() {
    let mut rng = OsRng;
    let server_kp = Cipher::generate_random_keypair(&mut rng);
    assert!(server_register_cxx(vec![], server_kp.public().to_vec()).is_err())
  }

  #[test]
  fn test_server_register_cxx_err_key_deserialization_failed() {
    let password = "hunter2";
    let mut client_rng = OsRng;
    let client_registration_start_result =
      ClientRegistration::<Cipher>::start(&mut client_rng, password.as_bytes()).unwrap();
    assert!(
      server_register_cxx(client_registration_start_result.message.serialize(), vec![]).is_err()
    )
  }

  #[test]
  fn test_server_register_finish_cxx_ok() {
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
    assert!(server_register_finish_cxx(
      server_registration_start_result.state.serialize(),
      client_registration_finish_result.message.serialize()
    )
    .is_ok());
  }

  #[test]
  fn test_server_register_finish_cxx_err_state_deserialization_failed() {
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
    assert!(server_register_finish_cxx(
      vec![],
      client_registration_finish_result.message.serialize()
    )
    .is_err());
  }

  #[test]
  fn test_server_register_finish_cxx_err_message_deserialization_failed() {
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
    assert!(
      server_register_finish_cxx(server_registration_start_result.state.serialize(), vec![])
        .is_err()
    );
  }

  #[test]
  fn test_server_login_cxx_ok() {
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
    assert!(server_login_cxx(
      p_file.serialize(),
      server_kp.private().to_vec(),
      client_login_start_result.message.serialize().unwrap()
    )
    .is_ok());
  }

  #[test]
  fn test_server_login_cxx_err_password_file_deserialization_failed() {
    let mut client_rng = OsRng;
    let mut server_rng = OsRng;
    let server_kp = Cipher::generate_random_keypair(&mut server_rng);
    let client_login_start_result = ClientLogin::<Cipher>::start(
      &mut client_rng,
      b"hunter2",
      ClientLoginStartParameters::default(),
    )
    .unwrap();
    assert!(server_login_cxx(
      vec![],
      server_kp.private().to_vec(),
      client_login_start_result.message.serialize().unwrap()
    )
    .is_err());
  }

  #[test]
  fn test_server_login_cxx_err_private_key_deserialization_failed() {
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
    assert!(server_login_cxx(
      p_file.serialize(),
      vec![],
      client_login_start_result.message.serialize().unwrap()
    )
    .is_err());
  }

  #[test]
  fn test_server_login_cxx_err_login_request_deserialization_failed() {
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
    assert!(server_login_cxx(p_file.serialize(), server_kp.private().to_vec(), vec![]).is_err());
  }

  #[test]
  fn test_server_login_finish_cxx_ok() {
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
    let client_login_finish_result = client_login_start_result
      .state
      .finish(
        server_login_start_result.message,
        ClientLoginFinishParameters::default(),
      )
      .unwrap();
    assert!(server_login_finish_cxx(
      server_login_start_result.state.serialize().unwrap(),
      client_login_finish_result.message.serialize().unwrap()
    )
    .is_ok());
  }

  #[test]
  fn test_server_login_finish_cxx_err_state_deserialization_failed() {
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
    let client_login_finish_result = client_login_start_result
      .state
      .finish(
        server_login_start_result.message,
        ClientLoginFinishParameters::default(),
      )
      .unwrap();
    assert!(server_login_finish_cxx(
      vec![],
      client_login_finish_result.message.serialize().unwrap()
    )
    .is_err());
  }

  #[test]
  fn test_server_login_finish_cxx_err_message_deserialization_failed() {
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
    assert!(
      server_login_finish_cxx(server_login_start_result.state.serialize().unwrap(), vec![])
        .is_err()
    );
  }
}
