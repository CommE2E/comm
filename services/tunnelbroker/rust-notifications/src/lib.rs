use lazy_static::lazy_static;
use log::{error, info};
use tokio::runtime::Runtime;

pub mod apns;

#[cxx::bridge]
mod ffi {
  extern "Rust" {
    fn sendNotifToAPNS(
      certificatePath: String,
      certificatePassword: String,
      deviceToken: String,
      message: String,
      sandbox: bool,
    ) -> bool;
  }
}

lazy_static! {
  // Lazy static Tokio runtime initialization
  pub static ref RUNTIME: Runtime = Runtime::new().unwrap();
}

#[allow(non_snake_case)]
pub fn sendNotifToAPNS(
  certificatePath: String,
  certificatePassword: String,
  deviceToken: String,
  message: String,
  sandbox: bool,
) -> bool {
  // Because of C++ doesn't know how to 'Panic' we need to catch all the panics
  let result = std::panic::catch_unwind(|| {
    RUNTIME.block_on(async {
      apns::sendByA2Client(
        &certificatePath,
        &certificatePassword,
        &deviceToken,
        &message,
        sandbox,
      )
      .await;
    })
  });
  match result {
    Ok(runtimeResult) => {
      info!("Push notification to device {:?} was sent to APNS with the result {:?}",
        deviceToken, runtimeResult
      );
    }
    Err(err) => {
      error!("Error: Panic in the Rust notification library in a sendByA2Client: {:?}",
        err
      );
      return false;
    }
  }
  true
}
