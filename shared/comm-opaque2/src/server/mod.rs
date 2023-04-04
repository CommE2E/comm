pub mod login;
pub mod register;

pub use login::Login;
pub use register::Registration;

use opaque_ke::rand::rngs::OsRng;
use opaque_ke::ServerSetup;

use crate::Cipher;

pub fn generate_server_setup() -> ServerSetup<Cipher> {
  ServerSetup::<Cipher>::new(&mut OsRng)
}
