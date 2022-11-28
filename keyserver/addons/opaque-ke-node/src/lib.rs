use argon2::Argon2;
use digest::generic_array::GenericArray;
use digest::Digest;
use neon::prelude::*;
use opaque_ke::ciphersuite::CipherSuite;
use opaque_ke::errors::InternalPakeError;
use opaque_ke::hash::Hash;
use opaque_ke::slow_hash::SlowHash;
use opaque_ke::{ClientRegistration, RegistrationRequest};
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

struct ClientRegistrationStartResult {
  message: RegistrationRequest<Cipher>,
  state: ClientRegistration<Cipher>,
}

impl Finalize for ClientRegistrationStartResult {}

fn client_register_start(
  mut cx: FunctionContext,
) -> JsResult<JsBox<ClientRegistrationStartResult>> {
  let password = cx.argument::<JsString>(0)?;
  let mut client_rng = OsRng;
  let client_registration_start_result = ClientRegistration::<Cipher>::start(
    &mut client_rng,
    password.value(&mut cx).as_bytes(),
  )
  .or_else(|err| cx.throw_error(err.to_string()))?;
  Ok(cx.boxed(ClientRegistrationStartResult {
    message: client_registration_start_result.message,
    state: client_registration_start_result.state,
  }))
}

fn get_registration_start_message_array(
  mut cx: FunctionContext,
) -> JsResult<JsArrayBuffer> {
  let client_registration_start_result =
    cx.argument::<JsBox<ClientRegistrationStartResult>>(0)?;
  Ok(JsArrayBuffer::external(
    &mut cx,
    client_registration_start_result.message.serialize(),
  ))
}

fn get_registration_start_state_array(
  mut cx: FunctionContext,
) -> JsResult<JsArrayBuffer> {
  let client_registration_start_result =
    cx.argument::<JsBox<ClientRegistrationStartResult>>(0)?;
  Ok(JsArrayBuffer::external(
    &mut cx,
    client_registration_start_result.state.serialize(),
  ))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
  cx.export_function("clientRegisterStart", client_register_start)?;
  cx.export_function(
    "getRegistrationStartMessageArray",
    get_registration_start_message_array,
  )?;
  cx.export_function(
    "getRegistrationStartStateArray",
    get_registration_start_state_array,
  )?;
  Ok(())
}
